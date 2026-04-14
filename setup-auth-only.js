const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pmo_dashboard';

async function setupAuth() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Import models
    const Permission = require('./server/models/Permission');
    const Role = require('./server/models/Role');
    const RolePermission = require('./server/models/RolePermission');
    const User = require('./server/models/User');

    // Clear only auth-related collections (NOT projects)
    console.log('Clearing existing auth data...');
    await User.deleteMany({});
    await RolePermission.deleteMany({});
    await Role.deleteMany({});
    await Permission.deleteMany({});
    console.log('Auth data cleared');

    // Create permissions
    console.log('Creating permissions...');
    const permissions = await Permission.insertMany([
      { permission_name: 'view_dashboard', description: 'Can view dashboard' },
      { permission_name: 'add_delete_projects', description: 'Can add and delete projects' },
      { permission_name: 'edit_projects', description: 'Can edit projects' },
      { permission_name: 'view_projects', description: 'Can view projects' },
      { permission_name: 'view_updates', description: 'Can view weekly updates' },
      { permission_name: 'manage_updates', description: 'Can create and edit weekly updates' },
      { permission_name: 'manage_users', description: 'Can create, edit, and delete users' },
      { permission_name: 'manage_import', description: 'Can import data from Excel files' }
    ]);
    console.log(`Created ${permissions.length} permissions`);

    // Create Admin role
    console.log('Creating Admin role...');
    const adminRole = await Role.create({
      role_name: 'Admin',
      description: 'Full system access'
    });
    console.log('Admin role created');

    // Create Project Manager role
    console.log('Creating Project Manager role...');
    const pmRole = await Role.create({
      role_name: 'Project Manager',
      description: 'Can manage projects and updates'
    });
    console.log('Project Manager role created');

    // Create Viewer role
    console.log('Creating Viewer role...');
    const viewerRole = await Role.create({
      role_name: 'Viewer',
      description: 'Can only view projects and updates'
    });
    console.log('Viewer role created');

    // Link all permissions to admin role
    console.log('Linking permissions to Admin role...');
    const adminRolePermissions = permissions.map(p => ({
      role_id: adminRole._id,
      permission_id: p._id
    }));
    await RolePermission.insertMany(adminRolePermissions);
    console.log(`Linked ${adminRolePermissions.length} permissions to Admin role`);

    // Link PM permissions
    console.log('Linking permissions to Project Manager role...');
    const pmPermissions = permissions.filter(p => 
      ['view_dashboard', 'add_delete_projects', 'edit_projects', 'view_projects', 'view_updates', 'manage_updates'].includes(p.permission_name)
    );
    const pmRolePermissions = pmPermissions.map(p => ({
      role_id: pmRole._id,
      permission_id: p._id
    }));
    await RolePermission.insertMany(pmRolePermissions);
    console.log(`Linked ${pmRolePermissions.length} permissions to Project Manager role`);

    // Link Viewer permissions
    console.log('Linking permissions to Viewer role...');
    const viewerPermissions = permissions.filter(p => 
      ['view_dashboard', 'view_projects', 'view_updates'].includes(p.permission_name)
    );
    const viewerRolePermissions = viewerPermissions.map(p => ({
      role_id: viewerRole._id,
      permission_id: p._id
    }));
    await RolePermission.insertMany(viewerRolePermissions);
    console.log(`Linked ${viewerRolePermissions.length} permissions to Viewer role`);

    // Create admin user
    console.log('Creating admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role_id: adminRole._id
    });
    console.log('Admin user created');

    // Verify setup
    console.log('\n=== Verification ===');
    const userWithRole = await User.findById(adminUser._id).populate('role_id');
    console.log('User:', userWithRole.username);
    console.log('Role:', userWithRole.role_id.role_name);
    
    const allRoles = await Role.find();
    console.log('Total Roles Created:', allRoles.length);
    allRoles.forEach(role => {
      console.log(`  - ${role.role_name}: ${role.description}`);
    });

    console.log('\n=== Setup Complete ===');
    console.log('Login credentials:');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    console.log('\nYour projects data was NOT affected!');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error setting up auth:', error);
    process.exit(1);
  }
}

setupAuth();
