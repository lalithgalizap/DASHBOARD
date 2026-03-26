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
      { permission_name: 'view_updates', description: 'Can view weekly updates' },
      { permission_name: 'manage_updates', description: 'Can create and edit weekly updates' },
      { permission_name: 'manage_users', description: 'Can create, edit, and delete users' },
      { permission_name: 'manage_import', description: 'Can import data from Excel files' }
    ]);
    console.log(`Created ${permissions.length} permissions`);

    // Create admin role
    console.log('Creating admin role...');
    const adminRole = await Role.create({
      role_name: 'Admin',
      description: 'Full system access',
      permissions: []
    });
    console.log('Admin role created');

    // Link permissions to admin role
    console.log('Linking permissions to admin role...');
    const rolePermissions = permissions.map(p => ({
      role_id: adminRole._id,
      permission_id: p._id
    }));
    await RolePermission.insertMany(rolePermissions);
    console.log(`Linked ${rolePermissions.length} permissions to admin role`);

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
