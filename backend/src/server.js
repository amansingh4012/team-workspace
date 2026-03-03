const http = require('http');
const app = require('./app');
const config = require('./config');
const { sequelize } = require('./models');
const websocket = require('./utils/websocket');

const server = http.createServer(app);

// ── Initialise project-room WebSocket server ──
websocket.init(server);

// ── Start Server ──
const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connected');

    // Only sync schema when explicitly requested (DB_FORCE_SYNC=true)
    // For normal starts, tables should already exist (created via `npm run db:sync`)
    if (process.env.DB_FORCE_SYNC === 'true') {
      await sequelize.sync({ force: true });
      console.log('✓ Models synchronized (force: true)');
    } else {
      console.log('✓ Skipping schema sync (tables already exist)');
    }

    server.listen(config.port, () => {
      console.log(`✓ Server running on http://localhost:${config.port}`);
      console.log(`✓ WebSocket running on ws://localhost:${config.port}`);
    });
  } catch (err) {
    console.error('✗ Unable to start server:', err.message);
    process.exit(1);
  }
};

start();

