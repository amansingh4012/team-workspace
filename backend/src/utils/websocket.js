const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');

/**
 * Map<projectId, Set<ws>>
 * Each project room holds a set of authenticated WebSocket clients.
 */
const rooms = new Map();

let wss;

/**
 * Initialise the WebSocket server on an existing HTTP server.
 * Expected client flow:
 *   1. Connect to ws://host:port
 *   2. Send JSON: { type: "join", projectId: "<uuid>", token: "<jwt>" }
 *   3. Server verifies JWT, adds client to room
 *   4. Server pushes events for that project room
 */
function init(server) {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    ws._projectId = null; // will be set after join
    ws._userId = null;

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === 'join') {
          handleJoin(ws, msg);
        }
        // Future: handle other client-initiated message types here
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      cleanup(ws);
    });

    ws.on('error', () => {
      cleanup(ws);
    });
  });

  console.log('✓ WebSocket server initialised');
}

/**
 * Handle a "join" message – verify JWT, then add client to the project room.
 */
function handleJoin(ws, { projectId, token }) {
  if (!projectId || !token) {
    ws.send(JSON.stringify({ type: 'error', message: 'projectId and token are required' }));
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    ws._userId = decoded.id;
    ws._projectId = projectId;

    if (!rooms.has(projectId)) {
      rooms.set(projectId, new Set());
    }
    rooms.get(projectId).add(ws);

    ws.send(JSON.stringify({ type: 'joined', projectId }));
  } catch {
    ws.send(JSON.stringify({ type: 'error', message: 'Authentication failed' }));
    ws.close();
  }
}

/**
 * Remove a client from its project room.
 */
function cleanup(ws) {
  if (ws._projectId && rooms.has(ws._projectId)) {
    const room = rooms.get(ws._projectId);
    room.delete(ws);
    if (room.size === 0) {
      rooms.delete(ws._projectId);
    }
  }
}

/**
 * Broadcast a JSON payload to every client in a project room.
 * @param {string} projectId
 * @param {object} payload  – will be JSON-stringified
 */
function broadcast(projectId, payload) {
  if (!rooms.has(projectId)) return;

  const data = JSON.stringify(payload);
  for (const client of rooms.get(projectId)) {
    if (client.readyState === 1) {
      client.send(data);
    }
  }
}

module.exports = { init, broadcast };
