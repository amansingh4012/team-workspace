require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  databaseUrl: process.env.DATABASE_URL || null,
  db: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    name: process.env.DB_NAME || 'team_workspace',
    dialect: 'postgres',
  },
  jwtSecret: process.env.JWT_SECRET || 'default_secret',
  jwtExpiresIn: '7d',
};
