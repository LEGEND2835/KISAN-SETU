import jwt from 'jsonwebtoken';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is missing.');
  }
  return secret;
}

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required. Please login.' });
  }

  try {
    const secret = getJwtSecret();
    jwt.verify(token, secret, (err, user) => {
      if (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired session token.' });
      }
      req.user = user;
      next();
    });
  } catch (err) {
    console.error('JWT Error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server configuration error.' });
  }
}

export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: requires one of the following roles: ${allowedRoles.join(', ')}`,
      });
    }
    next();
  };
}

export function generateToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}


