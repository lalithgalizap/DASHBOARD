const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pmo_dashboard';

async function migrate() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Import models
    const Permission = require('./server/models/Permission');
    const RolePermission = require('./server/models/RolePermission');

    // Find the old manage_projects permission
    const oldPermission = await Permission.findOne({ permission_name: 'manage_projects' });
    
    if (!oldPermission) {
      console.log('No manage_projects permission found - migration not needed');
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log('Found manage_projects permission:', oldPermission._id);

    // Find or create the new permissions
    let addDeletePerm = await Permission.findOne({ permission_name: 'add_delete_projects' });
    let editPerm = await Permission.findOne({ permission_name: 'edit_projects' });

    if (!addDeletePerm) {
      addDeletePerm = await Permission.create({
        permission_name: 'add_delete_projects',
        description: 'Can add and delete projects'
      });
      console.log('Created add_delete_projects permission:', addDeletePerm._id);
    } else {
      console.log('Found existing add_delete_projects permission:', addDeletePerm._id);
    }

    if (!editPerm) {
      editPerm = await Permission.create({
        permission_name: 'edit_projects',
        description: 'Can edit projects'
      });
      console.log('Created edit_projects permission:', editPerm._id);
    } else {
      console.log('Found existing edit_projects permission:', editPerm._id);
    }

    // Find all role-permission mappings for manage_projects
    const oldMappings = await RolePermission.find({ permission_id: oldPermission._id });
    console.log(`\nFound ${oldMappings.length} roles with manage_projects permission`);

    // For each role with manage_projects, add the new permissions
    for (const mapping of oldMappings) {
      const roleId = mapping.role_id;
      
      // Check if role already has add_delete_projects
      const hasAddDelete = await RolePermission.findOne({
        role_id: roleId,
        permission_id: addDeletePerm._id
      });
      
      // Check if role already has edit_projects
      const hasEdit = await RolePermission.findOne({
        role_id: roleId,
        permission_id: editPerm._id
      });

      // Add add_delete_projects if not present
      if (!hasAddDelete) {
        await RolePermission.create({
          role_id: roleId,
          permission_id: addDeletePerm._id
        });
        console.log(`  Added add_delete_projects to role ${roleId}`);
      }

      // Add edit_projects if not present
      if (!hasEdit) {
        await RolePermission.create({
          role_id: roleId,
          permission_id: editPerm._id
        });
        console.log(`  Added edit_projects to role ${roleId}`);
      }
    }

    // Delete old manage_projects mappings
    const deletedMappings = await RolePermission.deleteMany({ permission_id: oldPermission._id });
    console.log(`\nDeleted ${deletedMappings.deletedCount} manage_projects role-permission mappings`);

    // Delete the manage_projects permission itself
    await Permission.deleteOne({ _id: oldPermission._id });
    console.log('Deleted manage_projects permission');

    console.log('\n=== Migration Complete ===');
    console.log('Summary:');
    console.log(`- Migrated ${oldMappings.length} roles from manage_projects to add_delete_projects + edit_projects`);
    console.log('- All roles now have granular project permissions');
    console.log('- Old manage_projects permission removed');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

migrate();
