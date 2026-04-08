const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pmo_db';

async function setupDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Drop entire database to start fresh
    await mongoose.connection.db.dropDatabase();
    console.log('Database dropped');

    // Define schemas
    const Permission = mongoose.model('Permission', new mongoose.Schema({
      permission_name: { type: String, required: true, unique: true },
      description: String
    }));

    const Role = mongoose.model('Role', new mongoose.Schema({
      role_name: String,
      description: String,
      permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }]
    }));

    const RolePermission = mongoose.model('RolePermission', new mongoose.Schema({
      role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
      permission_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Permission', required: true }
    }));

    const User = mongoose.model('User', new mongoose.Schema({
      username: { type: String, required: true, unique: true },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' }
    }));

    // Create permissions
    console.log('Creating permissions...');
    const permissions = await Permission.insertMany([
      { permission_name: 'view_dashboard', description: 'Can view dashboard' },
      { permission_name: 'manage_projects', description: 'Can create, edit, and delete projects' },
      { permission_name: 'view_projects', description: 'Can view projects' },
      { permission_name: 'manage_users', description: 'Can create, edit, and delete users' },
      { permission_name: 'view_users', description: 'Can view users' },
      { permission_name: 'manage_import', description: 'Can import data from Excel files' },
      { permission_name: 'view_portfolio', description: 'Can view portfolio dashboard' },
      { permission_name: 'manage_portfolio', description: 'Can manage portfolio settings' },
      { permission_name: 'manage_roles', description: 'Can create, edit, and delete roles' },
      { permission_name: 'view_roles', description: 'Can view roles' },
      { permission_name: 'manage_closure_docs', description: 'Can upload and delete closure documents' }
    ]);
    console.log(`Created ${permissions.length} permissions`);

    // Helper to get permission IDs by name
    const getPermIds = (names) => permissions.filter(p => names.includes(p.permission_name)).map(p => p._id);

    // Create 6 default roles (undeletable)
    console.log('Creating default roles...');

    // 1. Admin - Full access
    const adminRole = await Role.create({
      role_name: 'Admin',
      description: 'Full system access (Cannot be deleted)',
      permissions: []
    });

    // 2. PM - Read/write projects only
    const pmRole = await Role.create({
      role_name: 'PM',
      description: 'Project Manager - Read/write projects only (Cannot be deleted)',
      permissions: []
    });

    // 3. PMO - Read/write projects and portfolio
    const pmoRole = await Role.create({
      role_name: 'PMO',
      description: 'PMO - Read/write projects and portfolio (Cannot be deleted)',
      permissions: []
    });

    // 4. CSP - Read/write performance/portfolio
    const cspRole = await Role.create({
      role_name: 'CSP',
      description: 'CSP - Read/write performance and portfolio (Cannot be deleted)',
      permissions: []
    });

    // 5. Managers - Read projects and portfolio
    const managersRole = await Role.create({
      role_name: 'Managers',
      description: 'Managers - Read projects and portfolio (Cannot be deleted)',
      permissions: []
    });

    // 6. SLTs - Read everything
    const sltsRole = await Role.create({
      role_name: 'SLTs',
      description: 'Senior Leadership - Read everything (Cannot be deleted)',
      permissions: []
    });

    console.log('Created 6 default roles');

    // Link permissions to each role
    console.log('Linking permissions to roles...');

    // Admin gets all permissions
    const adminRolePermissions = permissions.map(p => ({
      role_id: adminRole._id,
      permission_id: p._id
    }));
    await RolePermission.insertMany(adminRolePermissions);
    console.log('Linked all permissions to Admin');

    // PM: view_dashboard, view_projects, manage_projects, manage_import, manage_closure_docs
    const pmPerms = getPermIds(['view_dashboard', 'view_projects', 'manage_projects', 'manage_import', 'manage_closure_docs']);
    const pmRolePermissions = pmPerms.map(pid => ({ role_id: pmRole._id, permission_id: pid }));
    await RolePermission.insertMany(pmRolePermissions);
    console.log('Linked permissions to PM');

    // PMO: view_dashboard, view_projects, manage_projects, view_portfolio, manage_import, manage_closure_docs
    const pmoPerms = getPermIds(['view_dashboard', 'view_projects', 'manage_projects', 'view_portfolio', 'manage_import', 'manage_closure_docs']);
    const pmoRolePermissions = pmoPerms.map(pid => ({ role_id: pmoRole._id, permission_id: pid }));
    await RolePermission.insertMany(pmoRolePermissions);
    console.log('Linked permissions to PMO');

    // CSP: view_dashboard, view_portfolio, manage_portfolio, view_projects, manage_import
    const cspPerms = getPermIds(['view_dashboard', 'view_portfolio', 'manage_portfolio', 'view_projects', 'manage_import']);
    const cspRolePermissions = cspPerms.map(pid => ({ role_id: cspRole._id, permission_id: pid }));
    await RolePermission.insertMany(cspRolePermissions);
    console.log('Linked permissions to CSP');

    // Managers: view_dashboard, view_projects, view_portfolio
    const managerPerms = getPermIds(['view_dashboard', 'view_projects', 'view_portfolio']);
    const managerRolePermissions = managerPerms.map(pid => ({ role_id: managersRole._id, permission_id: pid }));
    await RolePermission.insertMany(managerRolePermissions);
    console.log('Linked permissions to Managers');

    // SLTs: view_dashboard, view_projects, view_portfolio, view_users, view_roles, manage_portfolio
    const sltPerms = getPermIds(['view_dashboard', 'view_projects', 'view_portfolio', 'view_users', 'view_roles', 'manage_portfolio']);
    const sltRolePermissions = sltPerms.map(pid => ({ role_id: sltsRole._id, permission_id: pid }));
    await RolePermission.insertMany(sltRolePermissions);
    console.log('Linked permissions to SLTs');

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
    
    const rolePerms = await RolePermission.find({ role_id: adminRole._id }).populate('permission_id');
    console.log('Permissions:', rolePerms.map(rp => rp.permission_id.permission_name).join(', '));

    console.log('\n=== Setup Complete ===');
    console.log('Login credentials:');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    console.log('\nDatabase is ready!');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

setupDatabase();
