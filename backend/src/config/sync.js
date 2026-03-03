/**
 * Sync all Sequelize models with the database.
 *
 * Usage:  node src/config/sync.js
 *
 * This uses { alter: true } so existing tables are adjusted
 * (columns added / changed) without dropping data.
 */
require('dotenv').config();
const sequelize = require('./database');

// Import models/index to register every model & association
require('../models');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established');

    const forceSync = process.env.DB_FORCE_SYNC === 'true';
    await sequelize.sync(forceSync ? { force: true } : { alter: true });
    console.log(`✓ All models synchronized (${forceSync ? 'force: true' : 'alter: true'})`);

    process.exit(0);
  } catch (err) {
    console.error('✗ Sync failed:', err.message);
    process.exit(1);
  }
})();
