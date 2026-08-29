import { inMemoryStore, isUsingMockStore, pool } from '../db/index.js';

let ioInstance = null;

export function initQueueSocket(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected to Socket.IO: ${socket.id}`);

    // Join centre-specific broadcast room (support object or raw string)
    socket.on('join:centre', (data) => {
      const centreId = typeof data === 'object' && data ? data.centreId : data;
      if (centreId) {
        socket.join(`centre:${centreId}`);
        socket.join(`centre_${centreId}`);
        console.log(`📢 Socket ${socket.id} joined room centre:${centreId}`);
      }
    });

    socket.on('join_centre', (data) => {
      const centreId = typeof data === 'object' && data ? data.centreId : data;
      if (centreId) {
        socket.join(`centre:${centreId}`);
        socket.join(`centre_${centreId}`);
        console.log(`📢 Socket ${socket.id} joined room centre:${centreId}`);
      }
    });

    // Leave centre room
    socket.on('leave:centre', (data) => {
      const centreId = typeof data === 'object' && data ? data.centreId : data;
      if (centreId) {
        socket.leave(`centre:${centreId}`);
        socket.leave(`centre_${centreId}`);
      }
    });

    // Join farmer private channel
    socket.on('join:farmer', (data) => {
      const farmerId = typeof data === 'object' && data ? data.farmerId : data;
      if (farmerId) {
        socket.join(`farmer:${farmerId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
}

/**
 * Broadcast queue update event to everyone subscribed to a specific Mandi centre
 */
export async function broadcastQueueUpdate(centreId) {
  if (!ioInstance) return;

  try {
    let bookings = [];

    if (!isUsingMockStore && pool) {
      const bRes = await pool.query('SELECT token_number, status FROM bookings WHERE centre_id = $1', [centreId]);
      bookings = bRes.rows;
    } else {
      bookings = inMemoryStore.bookings.filter(b => b.centre_id === centreId);
    }

    const waitingAtGate = bookings.filter(b => b.status === 'CHECKED_IN');
    const called = bookings.filter(b => b.status === 'CALLED');
    const quality = bookings.filter(b => b.status === 'QUALITY_INSPECTION');
    const weighing = bookings.filter(b => b.status === 'WEIGHING');
    const unloading = bookings.filter(b => b.status === 'UNLOADING');
    const completed = bookings.filter(b => b.status === 'PROCURED');

    const payload = {
      centreId,
      timestamp: new Date().toISOString(),
      counts: {
        total: bookings.length,
        waiting: waitingAtGate.length,
        called: called.length,
        quality: quality.length,
        weighing: weighing.length,
        unloading: unloading.length,
        completed: completed.length,
      },
      currentStageTokens: {
        gate: called.map(b => b.token_number),
        quality: quality.map(b => b.token_number),
        weighbridge: weighing.map(b => b.token_number),
        unloading: unloading.map(b => b.token_number),
      },
    };

    ioInstance.to(`centre:${centreId}`).emit('queue:updated', payload);
    ioInstance.to(`centre_${centreId}`).emit('queue_updated', payload);
    ioInstance.emit('global:queue_pulse', { centreId, counts: payload.counts });
  } catch (err) {
    console.error('Broadcast Queue Update Error:', err);
  }
}

/**
 * Broadcast token call event with sound chime trigger to Mandi TV Screen and Farmer Phone
 */
export function broadcastTokenCall(centreId, callData) {
  if (!ioInstance) return;

  const payload = {
    ...callData,
    timestamp: new Date().toISOString(),
  };

  ioInstance.to(`centre:${centreId}`).emit('token:called', payload);
  ioInstance.to(`centre_${centreId}`).emit('token_called', payload);
}
