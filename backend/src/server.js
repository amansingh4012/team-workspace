const http = require('http');
const app = require('./app');
const config = require('./config');
const { sequelize } = require('./models');
const websocket = require('./utils/websocket');

const server = http.createServer(app);

// ── Initialise project-room WebSocket server ──
websocket.init(server);

// ── Start Server ──
// Bind the port FIRST so Render's port scan succeeds, then connect to DB.
const start = async () => {
  server.listen(config.port, '0.0.0.0', async () => {
    console.log(`✓ Server running on http://0.0.0.0:${config.port}`);
    console.log(`✓ WebSocket running on ws://0.0.0.0:${config.port}`);

    try {
      await sequelize.authenticate();
      console.log('✓ Database connected');

      // Only sync schema when explicitly requested (DB_FORCE_SYNC=true)
      if (process.env.DB_FORCE_SYNC === 'true') {
        await sequelize.sync({ force: true });
        console.log('✓ Models synchronized (force: true)');
      } else {
        console.log('✓ Skipping schema sync (tables already exist)');
      }
    } catch (err) {
      console.error('✗ Database connection failed:', err.message);
      // Server stays up so Render doesn't restart-loop; API calls will fail gracefully.
    }
  });
};

start();

