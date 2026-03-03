const sequelize = require('../config/database');
const User = require('./User');
const Project = require('./Project');
const ProjectMember = require('./ProjectMember');
const Task = require('./Task');
const Activity = require('./Activity');

// ── Associations ──

// User <-> Project (owner)
User.hasMany(Project, { foreignKey: 'ownerId', as: 'ownedProjects' });
Project.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

// Project <-> User (many-to-many via ProjectMember)
Project.belongsToMany(User, {
  through: ProjectMember,
  as: 'members',
  foreignKey: 'projectId',
  otherKey: 'userId',
});
User.belongsToMany(Project, {
  through: ProjectMember,
  as: 'projects',
  foreignKey: 'userId',
  otherKey: 'projectId',
});

// Explicit associations so ProjectMember is queryable on its own
Project.hasMany(ProjectMember, { foreignKey: 'projectId', as: 'projectMembers' });
ProjectMember.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
User.hasMany(ProjectMember, { foreignKey: 'userId', as: 'memberships' });
ProjectMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Project <-> Task
Project.hasMany(Task, { foreignKey: 'projectId', as: 'tasks', onDelete: 'CASCADE' });
Task.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

// User <-> Task (assignee)
User.hasMany(Task, { foreignKey: 'assigneeId', as: 'assignedTasks' });
Task.belongsTo(User, { foreignKey: 'assigneeId', as: 'assignee' });

// Project <-> Activity
Project.hasMany(Activity, { foreignKey: 'projectId', as: 'activities', onDelete: 'CASCADE' });
Activity.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

// User <-> Activity
User.hasMany(Activity, { foreignKey: 'userId', as: 'activities' });
Activity.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  sequelize,
  User,
  Project,
  ProjectMember,
  Task,
  Activity,
};
