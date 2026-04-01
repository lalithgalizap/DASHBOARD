const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const dbAdapter = require('./dbAdapter');
const { authenticate, requirePermission, requireAdmin, getUserPermissions, generateToken } = require('./auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize database adapter
dbAdapter.initialize().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const upload = multer({ dest: 'uploads/' });

// Configure multer for project documents
const projectDocStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'project-documents');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const projectDocUpload = multer({ 
  storage: projectDocStorage,
  fileFilter: (req, file, cb) => {
    if (file.originalname.match(/\.(xlsx|xls)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

app.get('/api/projects', async (req, res) => {
  try {
    const { priority, stage, status, client } = req.query;
    const projects = await dbAdapter.getAllProjects({ priority, stage, status, client });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = await dbAdapter.getProjectById(req.params.id);
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects', authenticate, requirePermission('projects', 'manage'), async (req, res) => {
  try {
    const { name, priority, stage, summary, status, clients, links, owner, vertical, region, sponsor, anchor_customer } = req.body;
    const result = await dbAdapter.createProject({ name, priority, stage, summary, status, clients, links, owner, vertical, region, sponsor, anchor_customer });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/projects/:id', authenticate, requirePermission('projects', 'manage'), async (req, res) => {
  try {
    const { name, priority, stage, summary, status, clients, links, owner, vertical, region, sponsor, anchor_customer } = req.body;
    const result = await dbAdapter.updateProject(req.params.id, { name, priority, stage, summary, status, clients, links, owner, vertical, region, sponsor, anchor_customer });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/projects/:id/:field', authenticate, requirePermission('projects', 'manage'), async (req, res) => {
  const { id, field } = req.params;
  const { value } = req.body;
  
  // Whitelist allowed fields for security
  const allowedFields = {
    'priority': 'priority',
    'stage': 'stage', 
    'status': 'status'
  };
  
  if (!allowedFields[field]) {
    res.status(400).json({ error: 'Invalid field' });
    return;
  }
  
  try {
    // Get current project
    const project = await dbAdapter.getProjectById(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Update the specific field
    project[field] = value;
    
    // Use updateProject with the modified data
    const result = await dbAdapter.updateProject(id, project);
    res.json({ success: true, changes: result.changes, field, value });
  } catch (err) {
    console.error(`[PATCH] Error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/projects/:id', authenticate, requirePermission('projects', 'manage'), async (req, res) => {
  try {
    // Get project details before deletion to find the Excel file
    const project = await dbAdapter.getProjectById(req.params.id);
    
    if (project) {
      // Delete the Excel file if it exists
      const excelFilePath = path.join(__dirname, '..', 'project-documents', `${project.name}.xlsx`);
      if (fs.existsSync(excelFilePath)) {
        fs.unlinkSync(excelFilePath);
        // Excel file removed
      }
    }
    
    // Delete the project from database
    const result = await dbAdapter.deleteProject(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload project document
app.post('/api/projects/upload-document', authenticate, requirePermission('projects', 'manage'), projectDocUpload.single('file'), async (req, res) => {
  try {
    const { projectId, projectName } = req.body;
    
    if (!projectId || !projectName) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Project ID and name are required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file name matches project name
    const fileNameWithoutExt = req.file.originalname.replace(/\.(xlsx|xls)$/i, '');
    if (fileNameWithoutExt !== projectName) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        error: `File name must match project name: "${projectName}.xlsx"` 
      });
    }

    // Verify project exists
    const project = await dbAdapter.getProjectById(projectId);
    if (!project) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ 
      message: 'Document uploaded successfully',
      filename: req.file.originalname,
      projectName: projectName
    });
  } catch (err) {
    console.error('[UPLOAD] Error:', err);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/metrics', async (req, res) => {
  try {
    // Calculate metrics dynamically from projects table
    const projects = await dbAdapter.getAllProjects({});
    
    // Count active projects (status = 'On Track')
    const activeProjects = projects.filter(p => p.status === 'On Track').length;
    
    // Count unique clients across all projects (case-insensitive)
    const clientsSet = new Set();
    projects.forEach(project => {
      if (project.clients && project.clients.trim()) {
        // Split by comma, trim whitespace, and normalize to lowercase
        const projectClients = project.clients.split(',')
          .map(c => c.trim().toLowerCase())
          .filter(c => c.length > 0); // Filter out empty strings
        projectClients.forEach(client => {
          clientsSet.add(client);
        });
      }
    });
    const totalClients = clientsSet.size;
    
    // Count on-track projects based on status field (status = 'On Track')
    const onTrackProjects = projects.filter(p => p.status === 'On Track').length;
    const totalProjects = projects.length;
    
    // Count completed projects
    const completedProjects = projects.filter(p => p.status === 'Completed').length;
    
    const metrics = {
      active_projects: activeProjects,
      total_clients: totalClients,
      on_track: onTrackProjects,
      total_projects: totalProjects,
      completed_projects: completedProjects
    };
    
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/events', async (req, res) => {
  try {
    const events = await dbAdapter.getAllEvents();
    res.json(events.slice(0, 10));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const result = await dbAdapter.createEvent(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/import/excel', authenticate, requirePermission('import', 'manage'), upload.single('file'), (req, res) => {
  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    db.run('DELETE FROM projects', (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      const stmt = db.prepare(
        `INSERT INTO projects (name, priority, stage, summary, status, clients, links) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );

      data.forEach(row => {
        stmt.run(
          row.PROJECT || row.Name || '',
          row.PRI || row.Priority || '',
          row.STAGE || row.Stage || '',
          row.SUMMARY || row.Summary || '',
          row.STATUS || row.Status || '',
          row.CLIENTS || row.Clients || '',
          row.LINKS || row.Links || ''
        );
      });

      stmt.finalize((err) => {
        fs.unlinkSync(req.file.path);
        
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }

        res.json({ message: 'Import successful', count: data.length });
      });
    });
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: error.message });
  }
});


// Get project documents from Excel
app.get('/api/projects/:id/documents', authenticate, async (req, res) => {
  try {
    const projectId = req.params.id;
    
    // Get project to find its name
    const project = await dbAdapter.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Look for project-specific Excel file
    const filePath = path.join(__dirname, '..', 'project-documents', `${project.name}.xlsx`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.json({
        raidLog: [],
        raidDashboard: {},
        riskRegister: [],
        projectCharter: {},
        projectCover: {},
        projectPlan: [],
        milestoneTracker: [],
        stakeholderRegister: [],
        raciMatrix: [],
        resourceManagementPlan: [],
        governanceCadences: [],
        changeManagement: []
      });
    }
    
    const workbook = XLSX.readFile(filePath);
    
    const documents = {
      // RAID data
      raidLog: [],
      raidDashboard: {},
      riskRegister: [],
      
      // Project management data
      projectCharter: {},
      projectCover: {},
      projectPlan: [],
      milestoneTracker: [],
      
      // Stakeholder and resource data
      stakeholderRegister: [],
      raciMatrix: [],
      resourceManagementPlan: [],
      
      // Governance data
      governanceCadences: [],
      changeManagement: []
    };
    
    // Read RAID Log sheet
    if (workbook.SheetNames.includes('RAID Log')) {
      const worksheet = workbook.Sheets['RAID Log'];
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      documents.raidLog = data.filter(item => 
        item['RAID ID'] && 
        item.Type && 
        item.Title
      );
    }
    
    // Read Risk Register sheet
    if (workbook.SheetNames.includes('Risk Register')) {
      const worksheet = workbook.Sheets['Risk Register'];
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      documents.riskRegister = data.filter(item => item['ID'] || item['Risk Description']);
    }
    
    // Read RAID Dashboard sheet
    if (workbook.SheetNames.includes('RAID Dashboard')) {
      const worksheet = workbook.Sheets['RAID Dashboard'];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      documents.raidDashboard = {
        totalRAIDs: data[5] ? data[5][0] : 0,
        risks: data[5] ? data[5][2] : 0,
        assumptions: data[5] ? data[5][4] : 0,
        issues: data[5] ? data[5][6] : 0,
        dependencies: data[5] ? data[5][8] : 0,
        rawData: data
      };
    }
    
    // Read Project Cover Sheet and use as Project Charter source
    if (workbook.SheetNames.includes('Project Cover Sheet')) {
      const worksheet = workbook.Sheets['Project Cover Sheet'];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      
      // Helper to safely get cell value
      const getCell = (row, col) => {
        if (row < rawData.length && col < rawData[row].length) {
          return rawData[row][col];
        }
        return '';
      };

      // Helper to format Excel date
      const formatDate = (val) => {
        if (!val) return '';
        if (typeof val === 'number' && val > 40000) {
          const date = new Date((val - 25569) * 86400 * 1000);
          return date.toISOString().split('T')[0];
        }
        // If it's already a formatted date string, return as-is
        return val;
      };

      // Parse the structured grid layout from Project Cover Sheet
      // Based on typical layout: Labels in col 1, Values in col 2 and col 6
      const charter = {
        // Title from row 2 (workbook title)
        title: getCell(2, 0),
        
        // Basic Info from rows 5-9 (Project Cover Sheet layout)
        // Structure: Label(col 0), Value(col 2), Label(col 6), Value(col 8)
        basicInfo: {
          projectName: getCell(5, 2),
          projectManager: getCell(7, 2),
          projectSponsor: getCell(8, 2),
          client: getCell(6, 2),
          
          // Dates and values from column 8 (not 6!)
          projectStartDate: formatDate(getCell(5, 8)),
          forecastEndDate: formatDate(getCell(6, 8)),
          estimatedDuration: getCell(7, 8),
          
          estimatedBudget: getCell(8, 8),
          estimatedBenefits: getCell(9, 8),
          projectComplexity: getCell(9, 2)
        },
        
        // Placeholder for scope - will be populated from DB
        scope: {
          included: {
            label: 'Included',
            items: []
          },
          excluded: {
            label: 'Excluded',
            items: []
          }
        },
        
        rawData: rawData
      };

      documents.projectCharter = charter;
    }
    
    // Read Project Plan
    if (workbook.SheetNames.includes('Project Plan')) {
      const worksheet = workbook.Sheets['Project Plan'];
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      documents.projectPlan = data.filter(item => item['Task ID'] || item['Task Name']);
    }
    
    // Read Milestone Tracker
    if (workbook.SheetNames.includes('Milestone Tracker')) {
      const worksheet = workbook.Sheets['Milestone Tracker'];
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      documents.milestoneTracker = data.filter(item => item['Milestone Ref'] || item['Milestone / Task Name']);
    }
    
    // Read Stakeholder Register
    if (workbook.SheetNames.includes('Stakeholder Register')) {
      const worksheet = workbook.Sheets['Stakeholder Register'];
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      documents.stakeholderRegister = data.filter(item => item['Stakeholder ID'] || item['Name']);
    }
    
    // Read RACI Matrix
    if (workbook.SheetNames.includes('RACI Matrix')) {
      const worksheet = workbook.Sheets['RACI Matrix'];
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      documents.raciMatrix = data.filter(item => item['Deliverable / Task'] || item['RACI MATRIX']);
    }
    
    // Read Resource Management Plan
    if (workbook.SheetNames.includes('Resource Management Plan')) {
      const worksheet = workbook.Sheets['Resource Management Plan'];
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      documents.resourceManagementPlan = data.filter(item => Object.values(item).some(v => v && v !== ''));
    }
    
    // Read Resource Availability
    if (workbook.SheetNames.includes('Resource Availability')) {
      const worksheet = workbook.Sheets['Resource Availability'];
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      documents.resourceAvailability = data.filter(item => item['Availability ID']);
    }
    
    // Read Governance & Cadences - check multiple possible sheet names
    const governanceSheetNames = [
      'Governance & Cadences',
      'Governance Cadences',
      'Governance and Cadences',
      'Governance',
      'Cadences'
    ];
    
    let governanceSheetName = null;
    for (const name of governanceSheetNames) {
      if (workbook.SheetNames.includes(name)) {
        governanceSheetName = name;
        break;
      }
    }
    
    if (governanceSheetName) {
      const worksheet = workbook.Sheets[governanceSheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      
      // Filter: Accept any row that has at least one non-empty value
      documents.governanceCadences = data.filter(item => 
        Object.values(item).some(value => value && value !== '')
      );
    } else {
      documents.governanceCadences = [];
    }
    
    // Read Change Management Plan
    if (workbook.SheetNames.includes('Change Management Plan')) {
      const worksheet = workbook.Sheets['Change Management Plan'];
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      documents.changeManagement = data.filter(item => item['Change ID']);
    }
    
    res.json(documents);
  } catch (error) {
    console.error(`Error reading Excel file:`, error.message);
    res.status(500).json({ 
      error: `Failed to read project documents. ${error.message}` 
    });
  }
});

// ========== PROJECT SCOPE ENDPOINTS ==========

// Get project scope
app.get('/api/projects/:id/scope', authenticate, async (req, res) => {
  try {
    const projectId = req.params.id;
    const scope = await dbAdapter.getProjectScope(projectId);
    
    if (!scope) {
      return res.json({ scope_included: '', scope_excluded: '' });
    }
    
    res.json(scope);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update project scope
app.put('/api/projects/:id/scope', authenticate, async (req, res) => {
  const projectId = req.params.id;
  const { scope_included, scope_excluded } = req.body;
  
  try {
    await dbAdapter.upsertProjectScope(projectId, { scope_included, scope_excluded });
    res.json({ message: 'Scope updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ========== AUTHENTICATION ENDPOINTS ==========

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const user = await dbAdapter.getUserByUsername(username);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const permissions = await getUserPermissions(user.id);
    const token = generateToken(user);
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role_id: user.role_id,
        role: user.role,
        role_name: user.role_name,
        permissions: permissions || []
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Get current user
app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const user = await dbAdapter.getUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const permissions = await getUserPermissions(user.id);
    
    res.json({
      user: {
        ...user,
        permissions: permissions || []
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ========== USER MANAGEMENT (Admin only) ==========

// Get all users
app.get('/api/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await dbAdapter.getAllUsers();
    res.json(users);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Create user
app.post('/api/users', authenticate, requireAdmin, async (req, res) => {
  const { username, email, password, role_id, is_active } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = await dbAdapter.createUser({ username, email, password: hashedPassword, role_id: role_id || null });
    res.json({ ...result, message: 'User created successfully' });
  } catch (err) {
    if (err.message.includes('duplicate') || err.message.includes('unique')) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    return res.status(500).json({ error: err.message });
  }
});

// Update user
app.put('/api/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { username, email, password, role_id, is_active } = req.body;
    
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (password) {
      updateData.password = bcrypt.hashSync(password, 10);
    }
    if (role_id !== undefined) {
      updateData.role_id = role_id || null;
    }
    if (is_active !== undefined) {
      updateData.is_active = is_active;
    }
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    const result = await dbAdapter.updateUser(req.params.id, updateData);
    res.json({ changes: result.changes, message: 'User updated successfully' });
  } catch (err) {
    if (err.message && err.message.includes('duplicate')) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Delete user
app.delete('/api/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await dbAdapter.deleteUser(req.params.id);
    res.json({ changes: result.changes, message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ROLE MANAGEMENT (Admin only) ==========

// Get all roles with permissions
app.get('/api/roles', authenticate, requireAdmin, async (req, res) => {
  try {
    const roles = await dbAdapter.getAllRoles();
    const rolesWithPermissions = await Promise.all(
      roles.map(async (role) => {
        const permissions = await dbAdapter.getRolePermissions(role.id);
        return { 
          ...role, 
          name: role.role_name,
          permissions 
        };
      })
    );
    res.json(rolesWithPermissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all permissions
app.get('/api/permissions', authenticate, requireAdmin, async (req, res) => {
  try {
    const permissions = await dbAdapter.getAllPermissions();
    res.json(permissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create role
app.post('/api/roles', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, description, permission_ids } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    const result = await dbAdapter.createRole({ role_name: name, description });
    
    if (permission_ids && permission_ids.length > 0) {
      await dbAdapter.updateRolePermissions(result.id, permission_ids);
    }
    
    res.json({ id: result.id, message: 'Role created successfully' });
  } catch (err) {
    if (err.message && err.message.includes('duplicate')) {
      return res.status(409).json({ error: 'Role name already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Update role
app.put('/api/roles/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, description, permission_ids } = req.body;
    const roleId = req.params.id;
    
    const updateData = {};
    if (name) updateData.role_name = name;
    if (description !== undefined) updateData.description = description;
    
    if (Object.keys(updateData).length > 0) {
      await dbAdapter.updateRole(roleId, updateData);
    }
    
    if (permission_ids !== undefined) {
      await dbAdapter.updateRolePermissions(roleId, permission_ids);
    }
    
    res.json({ message: 'Role updated successfully' });
  } catch (err) {
    if (err.message && err.message.includes('duplicate')) {
      return res.status(409).json({ error: 'Role name already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Delete role
app.delete('/api/roles/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await dbAdapter.deleteRole(req.params.id);
    res.json({ changes: result.changes, message: 'Role deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve static files from React build
app.use(express.static(path.join(__dirname, '..', 'client', 'build')));

// Catch-all route to serve React app for client-side routing
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '..', 'client', 'build', 'index.html');
  
  // Check if build exists (for production), otherwise send helpful message
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // In development mode, the React dev server handles routing
    res.status(404).send('Build folder not found. Run "npm run build" in client folder for production, or use "npm run dev" for development.');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
