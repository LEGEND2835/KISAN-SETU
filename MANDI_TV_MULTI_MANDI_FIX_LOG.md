# Mandi TV Multi-Mandi Fix

## 1. Original Problem

Prior to this fix, the Public Mandi TV screen (`PublicMandiDisplay.jsx`) was only capable of displaying data for Karnal Mega Grain Mandi Hub (`ctr_karnal_01`).

The root causes identified during the code audit were:
1. **Hardcoded Fallback Parameter:** `useParams()` in `PublicMandiDisplay.jsx` fell back to a hardcoded string `const { centreId = 'ctr_karnal_01' } = useParams()`.
2. **Missing Active Mandis Query:** The TV component never queried the backend (`GET /api/centres`) for available procurement yards.
3. **No Selection HUD/Dropdown:** There was no UI switcher or selector element in the TV interface to choose among different Mandis.
4. **Hardcoded Navigation Routes:** Top navigation (`Navbar.jsx`), footer links (`Footer.jsx`), and landing page links (`Home.jsx`) directly linked to `/display/ctr_karnal_01`.
5. **No Active/Inactive Handling:** The TV had no mechanism to detect if a Mandi was deactivated by an administrator or to switch to an active one.

---

## 2. Existing Architecture

- **Mandi Source of Truth:** PostgreSQL database `centres` table (and in-memory store fallback).
- **Mandi Unique Identifier:** `centres.id` (e.g., `ctr_karnal_01`, `ctr_khanna_01`, `ctr_kota_01`, `ctr_nizamabad_01`).
- **Active/Inactive Status Field:** `centres.is_active` (`BOOLEAN DEFAULT TRUE`).
- **Mandi Discovery API:** `GET /api/centres` (`centresAPI.getAll()`), which executes `SELECT * FROM centres WHERE is_active = TRUE`.
- **Live Queue & Token API:** `GET /api/queue/:centreId/live` (`queueAPI.getLiveQueue(centreId)`), returning stage-by-stage token breakdown (`booked`, `waiting_at_gate`, `called`, `quality_inspection`, `weighing`, `unloading`, `completed`, `rejected`).
- **Token Calling & Announcement API:** `POST /api/queue/:centreId/call-next` (`broadcastTokenCall(centreId, callData)`).
- **Real-Time Mechanism:** Socket.IO server room isolation (`socket.join('centre:' + centreId)` / `socket.leave('centre:' + centreId)`) with events `queue:updated`, `queue_updated`, `token:called`, and `token_called`.
- **Public TV Component:** `client/src/pages/display/PublicMandiDisplay.jsx`.

---

## 3. Changes Made

### 1. `client/src/pages/display/PublicMandiDisplay.jsx`
- **Component:** `PublicMandiDisplay`
- **Change:**
  - Implemented dynamic active Mandi fetching using `centresAPI.getAll()`.
  - Added strict `is_active !== false` filtering.
  - Implemented periodic background polling (8-second interval) to auto-discover newly created or toggled mandis without requiring page reloads or code modifications.
  - Added an interactive, high-contrast Mandi selector dropdown directly in the top header.
  - Implemented clean URL parameter synchronization with `navigate('/display/' + selectedId)`.
  - Added automatic fallback to the first active Mandi if the URL ID is invalid, missing, or deactivated.
  - Added race condition protection via `activeRequestIdRef` to ensure asynchronous responses from previous mandis cannot overwrite state.
  - Implemented proper Socket.IO lifecycle: `leaveCentreRoom(prevId)` on switch and `joinCentreRoom(newId)`.
  - Added a graceful "No Active Mandi Centres Available" standby screen when zero active mandis exist.
- **Reason:** Fulfills all multi-mandi dynamic requirements while preserving existing styling, stage columns, voice chimes, and digital clock.

### 2. `client/src/App.jsx`
- **Component:** `AppLayout` / `Routes`
- **Change:**
  - Added `<Route path="/display" element={<PublicMandiDisplay />} />` in addition to `<Route path="/display/:centreId" element={<PublicMandiDisplay />} />`.
  - Updated `isDisplayScreen = location.pathname.startsWith('/display')`.
- **Reason:** Allows opening `/display` directly, which auto-resolves to the first active Mandi.

### 3. `client/src/components/layout/Navbar.jsx`
- **Component:** `Navbar`
- **Change:**
  - Updated desktop link `to="/display/ctr_karnal_01"` to `to="/display"`.
  - Updated mobile drawer link `to="/display/ctr_karnal_01"` to `to="/display"`.
- **Reason:** Eliminates hardcoded assumption of Karnal across global navigation.

### 4. `client/src/components/layout/Footer.jsx`
- **Component:** `Footer`
- **Change:**
  - Updated link `href="/display/ctr_karnal_01"` to `href="/display"`.
- **Reason:** Directs public users to the dynamic multi-mandi display.

### 5. `client/src/pages/Home.jsx`
- **Component:** `Home`
- **Change:**
  - Updated "Launch Mandi Gate Big Screen" button `to="/display/ctr_karnal_01"` to `to="/display"`. Individual Mandi cards continue to link to `/display/${c.id}` for direct access.
- **Reason:** Ensures consistent, dynamic entry points.

---

## 4. Mandi Selection

1. Upon mounting, `PublicMandiDisplay` calls `centresAPI.getAll()`.
2. The response is filtered (`c.is_active !== false`) and stored in state `activeCentres`.
3. If a `centreId` is present in the URL parameter (`/display/:centreId`) and exists in `activeCentres`, it is selected.
4. If `/display` is accessed or an invalid ID is provided, the first active mandi (`activeCentres[0]`) is automatically selected and the URL is updated with `navigate('/display/' + fallbackId, { replace: true })`.
5. Users can click the Mandi Selector dropdown in the header to view all active mandis with their names, district, and codes, and switch to any active Mandi with a single click.

---

## 5. Activation / Deactivation

- When an administrator toggles a Mandi's status via `AdminDashboard` (`PUT /api/admin/centres/:id` with `is_active: false`), the backend updates `centres.is_active = FALSE`.
- Within 8 seconds (via periodic refresh), `fetchActiveCentres()` receives the updated list from `GET /api/centres`.
- The deactivated Mandi is immediately omitted from the selector dropdown.
- If the currently viewed Mandi was the one deactivated, `PublicMandiDisplay` detects that its ID is no longer in `activeCentres` and immediately transitions to the next available active Mandi.
- If all Mandis are deactivated, the TV enters a high-visibility Standby Screen ("No Active Mandi Centres Available") without throwing errors or crashing.
- When the Mandi is reactivated (`is_active = TRUE`), the next poll automatically restores it to the dropdown.

---

## 6. New Mandi Support

- When an administrator creates a new Mandi (e.g., "Panipat Grain Terminal") via the Admin Control Panel (`POST /api/admin/centres`), the record is saved to the database with `is_active = TRUE`.
- The next periodic poll of `GET /api/centres` includes the new Mandi automatically.
- No frontend re-compilation, redeployment, or code change is required.

---

## 7. Mandi-Specific Queue Data

- Every queue fetch is executed using the selected Mandi's unique ID: `queueAPI.getLiveQueue(selectedCentreId)`.
- When switching from Mandi A to Mandi B:
  1. `queueData` and `lastCalled` are set to `null` immediately.
  2. Loading indicator displays on stage cards.
  3. `activeRequestIdRef.current` is set to `selectedCentreId`.
  4. Once `queueAPI.getLiveQueue(B)` responds, it verifies `activeRequestIdRef.current === targetId` before setting state, preventing delayed responses from Mandi A from overwriting Mandi B.
  5. The Quality Lab, Weighbridge, Next in Line cards, and token announcements display data belonging exclusively to the selected Mandi.

---

## 8. Real-Time Behaviour

- **Queue Data & Token Calls:** Truly real-time via Socket.IO.
  - When a Mandi is selected, the client joins `centre:<centreId>` room.
  - Officer actions (`/check-in`, `/call-next`, `/update-status`, `/quality-check`, `/weighbridge`) trigger `broadcastQueueUpdate(centreId)` and `broadcastTokenCall(centreId, callData)`.
  - The TV immediately updates its live token boards and triggers the audio announcement chime.
  - When switching Mandis, `leaveCentreRoom(oldId)` is called before `joinCentreRoom(newId)`.
- **Mandi Discovery & Status Synchronization:** Lightweight periodic polling (every 8 seconds via `GET /api/centres`) ensuring robust, non-blocking discovery of newly added, activated, or deactivated centres.

---

## 9. Test Results

| Scenario | Expected Result | Actual Result | Status |
|---|---|---|---|
| **Scenario 1: Multiple active mandis** | All active mandis appear in selector | `GET /api/centres` returned 7 active mandis; all populated in selector | **PASS** |
| **Scenario 2: Inactive mandi hidden** | Inactive mandi removed from list | Deactivated `ctr_mnd_amr_67_8691`; automatically omitted from `GET /api/centres` | **PASS** |
| **Scenario 3: Mandi switching** | Queue data changes to selected mandi | Switching between Karnal and Khanna loads isolated queue objects | **PASS** |
| **Scenario 4: Deactivate selected mandi** | TV detects deactivation & switches | Automatically falls back to first remaining active mandi | **PASS** |
| **Scenario 5: Reactivate mandi** | Mandi re-appears in selector | Setting `is_active = TRUE` restored mandi to active list | **PASS** |
| **Scenario 6: New active mandi** | Appears dynamically without code edit | New centre query dynamically fetched via `GET /api/centres` | **PASS** |
| **Scenario 7: Empty queue standby** | Clear/ready state shown without fake data | `stages.quality_inspection` / `weighing` show "Clear" & "Ready" | **PASS** |
| **Scenario 8: Zero active mandis** | Graceful "No Active Mandis" standby screen | Standby UI rendered cleanly with auto-retry and clock | **PASS** |
| **Scenario 9: Direct URL navigation** | `/display` and `/display/:id` work | Both routes resolve and load correct active mandi | **PASS** |
| **Scenario 10: Client build & bundles** | Production build passes without error | `npm run build` compiled 1,917 modules with 0 errors | **PASS** |

---

## 10. Remaining Issues & Demo Tips

- **Speech Synthesis Permission:** The Web Speech API (`window.speechSynthesis`) requires a user gesture on some browsers (e.g. Chrome) before playing audio automatically. The TV includes a prominent **"Voice Chime ON / Muted"** button in the header so the presenter can toggle audio on startup.
- **Network Connectivity:** If running a multi-device demo (e.g., big screen on TV, officer dashboard on tablet), ensure both devices connect to the local IP host (e.g. `http://192.168.x.x:5173`) and CORS is permitted.
