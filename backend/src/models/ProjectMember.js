const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProjectMember = sequelize.define('ProjectMember', {
  projectId: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
  },
  role: {
    type: DataTypes.ENUM('admin', 'member'),
    defaultValue: 'member',
  },
}, {
  timestamps: true,
});

module.exports = ProjectMember;
