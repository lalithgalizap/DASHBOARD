const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pmo_db';

const roleSchema = new mongoose.Schema({
  name: String,
  description: String,
  permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }]
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' }
});

const permissionSchema = new mongoose.Schema({
  permission_name: { type: String, required: true, unique: true },
  description: String
});

const Role = mongoose.model('Role', roleSchema);
const User = mongoose.model('User', userSchema);
const Permission = mongoose.model('Permission', permissionSchema);

async function seedAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create permissions
    const permissions = [
      { permission_name: 'Manage Projects', description: 'Can create, edit, and delete projects' },
      { permission_name: 'View Projects', description: 'Can view projects' },
      { permission_name: 'Manage Updates', description: 'Can create and edit weekly updates' },
      { permission_name: 'Manage Users', description: 'Can create, edit, and delete users' },
      { permission_name: 'Manage Import', description: 'Can import data from Excel files' }
    ];

    await Permission.deleteMany({});
    const createdPermissions = await Permission.insertMany(permissions);
    console.log('Permissions created');

    // Create admin role with all permissions
    await Role.deleteMany({ name: 'Admin' });
    const adminRole = await Role.create({
      name: 'Admin',
      description: 'Full system access',
      permissions: createdPermissions.map(p => p._id)
    });
    console.log('Admin role created');

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await User.deleteMany({ username: 'admin' });
    await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role_id: adminRole._id
    });
    console.log('Admin user created successfully!');
    console.log('');
    console.log('Login credentials:');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    console.log('');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedAdmin();
