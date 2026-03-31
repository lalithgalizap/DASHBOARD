require('dotenv').config();
const connectDB = require('./mongodb');
const models = require('./models');

class DatabaseAdapter {
  constructor() {
    this.mongoConnection = null;
  }

  async initialize() {
    console.log('Initializing MongoDB connection...');
    this.mongoConnection = await connectDB();
    console.log('MongoDB adapter ready');
  }

  // Projects
  async getAllProjects(filters = {}) {
    const query = {};
    if (filters.priority && filters.priority !== 'All') query.priority = filters.priority;
    if (filters.stage && filters.stage !== 'All') query.stage = filters.stage;
    if (filters.status && filters.status !== 'All') query.status = filters.status;
    if (filters.client && filters.client !== 'All') query.clients = new RegExp(filters.client, 'i');
    
    const projects = await models.Project.find(query).lean();
    return projects.map(p => ({ ...p, id: p._id.toString() }));
  }

  async getProjectById(id) {
    const project = await models.Project.findById(id).lean();
    return project ? { ...project, id: project._id.toString() } : null;
  }

  async createProject(data) {
    // Generate unique project_id if not provided
    if (!data.project_id) {
      data.project_id = Date.now().toString();
    }
    const project = await models.Project.create(data);
    return { id: project._id.toString() };
  }

  async updateProject(id, data) {
    await models.Project.findByIdAndUpdate(id, data);
    return { changes: 1 };
  }

  async deleteProject(id) {
    await models.Project.findByIdAndDelete(id);
    return { changes: 1 };
  }

  // Users
  async getAllUsers() {
    const users = await models.User.find().populate('role_id').lean();
    return users.map(u => ({ 
      ...u, 
      id: u._id.toString(), 
      role_id: u.role_id?._id.toString(),
      role: u.role_id?.role_name,
      role_name: u.role_id?.role_name
    }));
  }

  async getUserById(id) {
    const user = await models.User.findById(id).populate('role_id').lean();
    if (!user) return null;
    return { 
      ...user, 
      id: user._id.toString(), 
      role_id: user.role_id?._id.toString(),
      role: user.role_id?.role_name,
      role_name: user.role_id?.role_name
    };
  }

  async getUserByUsername(username) {
    const user = await models.User.findOne({ username }).populate('role_id').lean();
    if (!user) return null;
    return { 
      ...user, 
      id: user._id.toString(), 
      role_id: user.role_id?._id.toString(),
      role: user.role_id?.role_name,
      role_name: user.role_id?.role_name
    };
  }

  async createUser(data) {
    const user = await models.User.create(data);
    return { id: user._id.toString() };
  }

  async updateUser(id, data) {
    await models.User.findByIdAndUpdate(id, data);
    return { changes: 1 };
  }

  async deleteUser(id) {
    await models.User.findByIdAndDelete(id);
    return { changes: 1 };
  }

  // Roles
  async getRoleByName(roleName) {
    const role = await models.Role.findOne({ role_name: roleName }).lean();
    return role ? { ...role, id: role._id.toString() } : null;
  }

  async getAllRoles() {
    const roles = await models.Role.find().lean();
    return roles.map(r => ({ ...r, id: r._id.toString() }));
  }

  async getRoleById(id) {
    const role = await models.Role.findById(id).lean();
    return role ? { ...role, id: role._id.toString() } : null;
  }

  async createRole(data) {
    const role = await models.Role.create(data);
    return { id: role._id.toString() };
  }

  async updateRole(id, data) {
    await models.Role.findByIdAndUpdate(id, data);
    return { changes: 1 };
  }

  async deleteRole(id) {
    await models.Role.findByIdAndDelete(id);
    return { changes: 1 };
  }

  // Permissions
  async getAllPermissions() {
    const permissions = await models.Permission.find().lean();
    return permissions.map(p => ({ 
      ...p, 
      id: p._id.toString(),
      name: p.permission_name,
      resource: p.resource,
      action: p.action
    }));
  }

  async getRolePermissions(roleId) {
    const rolePermissions = await models.RolePermission.find({ role_id: roleId }).populate('permission_id').lean();
    return rolePermissions.map(rp => ({
      role_id: rp.role_id.toString(),
      permission_id: rp.permission_id._id.toString(),
      name: rp.permission_id.permission_name,
      description: rp.permission_id.description,
      resource: rp.permission_id.resource,
      action: rp.permission_id.action
    }));
  }

  async updateRolePermissions(roleId, permissionIds) {
    await models.RolePermission.deleteMany({ role_id: roleId });
    
    if (permissionIds && permissionIds.length > 0) {
      const rolePermissions = permissionIds.map(permId => ({
        role_id: roleId,
        permission_id: permId
      }));
      await models.RolePermission.insertMany(rolePermissions);
    }
    return { changes: permissionIds.length };
  }

  async getUserPermissions(userId) {
    const user = await models.User.findById(userId).populate('role_id');
    if (!user || !user.role_id) return [];
    
    const rolePermissions = await models.RolePermission.find({ role_id: user.role_id._id }).populate('permission_id');
    return rolePermissions.map(rp => rp.permission_id.permission_name);
  }

  // Project Scope
  async getProjectScope(projectId) {
    const scope = await models.ProjectScope.findOne({ project_id: projectId }).lean();
    return scope ? { ...scope, id: scope._id.toString() } : null;
  }

  async upsertProjectScope(projectId, data) {
    const result = await models.ProjectScope.findOneAndUpdate(
      { project_id: projectId },
      { ...data, project_id: projectId, updated_at: new Date() },
      { upsert: true, new: true }
    );
    return { changes: 1 };
  }

  // Events
  async getAllEvents() {
    const events = await models.Event.find().sort({ start_date: 1 }).lean();
    return events.map(e => ({ ...e, id: e._id.toString() }));
  }

  async getEventsByProject(projectId) {
    const events = await models.Event.find({ project_id: projectId }).sort({ start_date: 1 }).lean();
    return events.map(e => ({ ...e, id: e._id.toString() }));
  }

  async createEvent(data) {
    const event = await models.Event.create(data);
    return { id: event._id.toString() };
  }
}

module.exports = new DatabaseAdapter();
