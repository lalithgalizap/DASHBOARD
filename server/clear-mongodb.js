const connectDB = require('./mongodb');
const {
  Project,
  ProjectScope,
  Event,
  Metric,
  User,
  Role,
  Permission,
  RolePermission
} = require('./models');

async function clearMongoDB() {
  try {
    await connectDB();
    console.log('\n=== Clearing MongoDB Collections ===\n');

    await Role.deleteMany({});
    console.log('✓ Cleared roles');

    await Permission.deleteMany({});
    console.log('✓ Cleared permissions');

    await RolePermission.deleteMany({});
    console.log('✓ Cleared role_permissions');

    await User.deleteMany({});
    console.log('✓ Cleared users');

    await Project.deleteMany({});
    console.log('✓ Cleared projects');

    await ProjectScope.deleteMany({});
    console.log('✓ Cleared project_scope');

    await Event.deleteMany({});
    console.log('✓ Cleared events');

    await Metric.deleteMany({});
    console.log('✓ Cleared metrics');

    console.log('\n=== MongoDB Cleared Successfully ===\n');
    process.exit(0);
  } catch (error) {
    console.error('Error clearing MongoDB:', error);
    process.exit(1);
  }
}

clearMongoDB();
