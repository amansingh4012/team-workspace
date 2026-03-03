const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: '',
  },
  status: {
    type: DataTypes.ENUM('todo', 'inprogress', 'done'),
    defaultValue: 'todo',
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium',
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  assigneeId: {
    type: DataTypes.UUID,
    allowNull: true,
    defaultValue: null,
  },
  attachmentUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null,
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  timestamps: true,
});

module.exports = Task;
