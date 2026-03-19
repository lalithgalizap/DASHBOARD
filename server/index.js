const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./database');
const { authenticate, requirePermission, requireAdmin, getUserPermissions, generateToken } = require('./auth');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const upload = multer({ dest: 'uploads/' });

app.get('/api/projects', (req, res) => {
  const { priority, stage, status, client } = req.query;
  let query = 'SELECT * FROM projects WHERE 1=1';
  const params = [];

  if (priority && priority !== 'All') {
    query += ' AND priority = ?';
    params.push(priority);
  }
  if (stage && stage !== 'All') {
    query += ' AND stage = ?';
    params.push(stage);
  }
  if (status && status !== 'All') {
    query += ' AND status = ?';
    params.push(status);
  }
  if (client && client !== 'All') {
    query += ' AND clients LIKE ?';
    params.push(`%${client}%`);
  }

  query += ' ORDER BY id DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/projects/:id', (req, res) => {
  db.get('SELECT * FROM projects WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(row);
  });
});

app.post('/api/projects', authenticate, requirePermission('projects', 'manage'), (req, res) => {
  const { name, priority, stage, summary, status, clients, links, owner, vertical, region, sponsor, anchor_customer } = req.body;
  
  db.run(
    `INSERT INTO projects (name, priority, stage, summary, status, clients, links, owner, vertical, region, sponsor, anchor_customer) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, priority, stage, summary, status, clients, links, owner, vertical, region, sponsor, anchor_customer],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      updateMetrics();
      res.json({ id: this.lastID });
    }
  );
});

app.put('/api/projects/:id', authenticate, requirePermission('projects', 'manage'), (req, res) => {
  const { name, priority, stage, summary, status, clients, links, owner, vertical, region, sponsor, anchor_customer } = req.body;
  
  db.run(
    `UPDATE projects 
     SET name = ?, priority = ?, stage = ?, summary = ?, status = ?, clients = ?, links = ?, owner = ?, vertical = ?, region = ?, sponsor = ?, anchor_customer = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [name, priority, stage, summary, status, clients, links, owner, vertical, region, sponsor, anchor_customer, req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      updateMetrics();
      res.json({ changes: this.changes });
    }
  );
});

app.patch('/api/projects/:id/:field', authenticate, requirePermission('projects', 'manage'), (req, res) => {
  const { id, field } = req.params;
  const { value } = req.body;
  
  console.log(`[PATCH] Updating project ${id}, field: ${field}, value: ${value}`);
  
  // Whitelist allowed fields for security
  const allowedFields = {
    'priority': 'priority',
    'stage': 'stage', 
    'status': 'status'
  };
  
  if (!allowedFields[field]) {
    console.log(`[PATCH] Invalid field: ${field}`);
    res.status(400).json({ error: 'Invalid field' });
    return;
  }
  
  // Build safe query with whitelisted field name
  const query = `UPDATE projects SET ${allowedFields[field]} = ? WHERE id = ?`;
  
  db.run(query, [value, id], function(err) {
    if (err) {
      console.error(`[PATCH] Database error:`, err.message);
      res.status(500).json({ error: err.message });
      return;
    }
    console.log(`[PATCH] Successfully updated ${this.changes} row(s)`);
    res.json({ success: true, changes: this.changes, field, value });
  });
});

app.delete('/api/projects/:id', authenticate, requirePermission('projects', 'manage'), (req, res) => {
  db.run('DELETE FROM projects WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    updateMetrics();
    res.json({ changes: this.changes });
  });
});

app.get('/api/metrics', (req, res) => {
  // Calculate metrics dynamically from projects table
  db.all('SELECT status, clients, stage FROM projects', (err, projects) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Count active projects (status = 'Active')
    const activeProjects = projects.filter(p => p.status === 'Active').length;
    
    // Count unique clients across all projects
    const clientsSet = new Set();
    projects.forEach(project => {
      if (project.clients) {
        // Split by comma and trim whitespace
        const projectClients = project.clients.split(',').map(c => c.trim());
        projectClients.forEach(client => {
          if (client) clientsSet.add(client);
        });
      }
    });
    const totalClients = clientsSet.size;
    
    // Count on-track projects based on Progress field (stage = 'On-Track')
    const onTrackProjects = projects.filter(p => p.stage === 'On-Track').length;
    const totalProjects = projects.length;
    
    const metrics = {
      active_projects: activeProjects,
      total_clients: totalClients,
      on_track: onTrackProjects,
      total_projects: totalProjects
    };
    
    res.json(metrics);
  });
});

app.get('/api/events', (req, res) => {
  db.all('SELECT * FROM events ORDER BY date ASC LIMIT 10', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/events', (req, res) => {
  const { title, date, tag } = req.body;
  
  db.run(
    'INSERT INTO events (title, date, tag) VALUES (?, ?, ?)',
    [title, date, tag],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID });
    }
  );
});

app.get('/api/weekly-updates', (req, res) => {
  const { week, project } = req.query;
  let query = 'SELECT * FROM weekly_updates WHERE 1=1';
  const params = [];

  if (week) {
    query += ' AND week_date = ?';
    params.push(week);
  }
  if (project && project !== 'All Projects') {
    query += ' AND project_name = ?';
    params.push(project);
  }

  query += ' ORDER BY week_date DESC, project_name ASC';

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/weekly-updates', authenticate, requirePermission('updates', 'manage'), (req, res) => {
  const { project_id, project_name, stage, week_date, name, rag, update_text, next_steps, blockers, customer_engagement, milestone_achieved, momentum, traction, objective } = req.body;
  
  db.run(
    `INSERT INTO weekly_updates (project_id, project_name, stage, week_date, name, rag, update_text, next_steps, blockers, customer_engagement, milestone_achieved, momentum, traction, objective) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [project_id, project_name, stage, week_date, name, rag, update_text, next_steps, blockers, customer_engagement, milestone_achieved, momentum, traction, objective],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID });
    }
  );
});

app.put('/api/weekly-updates/:id', authenticate, requirePermission('updates', 'manage'), (req, res) => {
  const { project_name, stage, week_date, name, rag, update_text, next_steps, blockers, customer_engagement, milestone_achieved, momentum, traction, objective } = req.body;
  
  db.run(
    `UPDATE weekly_updates 
     SET project_name = ?, stage = ?, week_date = ?, name = ?, rag = ?, update_text = ?, next_steps = ?, blockers = ?, customer_engagement = ?, milestone_achieved = ?, momentum = ?, traction = ?, objective = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [project_name, stage, week_date, name, rag, update_text, next_steps, blockers, customer_engagement, milestone_achieved, momentum, traction, objective, req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ changes: this.changes });
    }
  );
});

app.delete('/api/weekly-updates/:id', authenticate, requirePermission('updates', 'manage'), (req, res) => {
  db.run('DELETE FROM weekly_updates WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ changes: this.changes });
  });
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

        updateMetrics();
        res.json({ message: 'Import successful', count: data.length });
      });
    });
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: error.message });
  }
});

function updateMetrics() {
  db.get(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status NOT IN ('Complete', 'On-hold', 'Archived') THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN status = 'On-hold' THEN 1 ELSE 0 END) as paused,
      SUM(CASE WHEN stage = 'Incubate' THEN 1 ELSE 0 END) as incubate,
      SUM(CASE WHEN priority IN ('P0', 'P1') THEN 1 ELSE 0 END) as pr_projects,
      SUM(CASE WHEN status IN ('On-track', 'Active') THEN 1 ELSE 0 END) as on_track,
      0 as budget_expended,
      0 as budget_recommended
    FROM projects
  `, (err, row) => {
    if (err) return;
    
    db.run(`
      UPDATE metrics SET 
        active_initiatives = ?,
        paused_initiatives = ?,
        incubate_initiatives = ?,
        pr_projects = ?,
        on_track = ?,
        total_projects = ?,
        budget_expended = ?,
        budget_recommended = ?,
        updated_at = CURRENT_TIMESTAMP
    `, [row.active, row.paused, row.incubate, row.pr_projects, row.on_track, row.total, row.budget_expended, row.budget_recommended]);
  });
}

// Get project documents from Excel
app.get('/api/projects/:id/documents', (req, res) => {
  // Prevent caching to ensure fresh data on each request
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  try {
    // Use the standardized PM workbook
    const excelFilePath = path.join(__dirname, '..', 'All_in_One_PM_Workbook.xlsx');
    console.log(`[${new Date().toISOString()}] Reading Excel file: ${excelFilePath} for project ${req.params.id}...`);
    
    const workbook = XLSX.readFile(excelFilePath);
    
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
      resourceManagement: {},
      resourceAvailability: [],
      
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
      
      // Debug: Log raw data structure
      console.log('[Charter Debug] Project Cover Sheet raw data (first 15 rows):');
      for (let i = 0; i < Math.min(15, rawData.length); i++) {
        console.log(`  Row ${i}:`, rawData[i]);
      }
      
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

      console.log('[Charter Debug] Parsed values:', charter.basicInfo);
      documents.projectCharter = charter;
      console.log(`[Charter] Parsed from Cover Sheet: ${charter.basicInfo.projectName}, Manager: ${charter.basicInfo.projectManager}`);
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
      if (data.length > 0) {
        documents.resourceManagement = data[0];
      }
    }
    
    // Read Resource Availability
    if (workbook.SheetNames.includes('Resource Availability')) {
      const worksheet = workbook.Sheets['Resource Availability'];
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      documents.resourceAvailability = data.filter(item => item['Availability ID']);
    }
    
    // Read Governance & Cadences
    if (workbook.SheetNames.includes('Governance & Cadences')) {
      const worksheet = workbook.Sheets['Governance & Cadences'];
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      documents.governanceCadences = data.filter(item => item['Meeting Name'] || item['Meeting Type']);
    }
    
    // Read Change Management Plan
    if (workbook.SheetNames.includes('Change Management Plan')) {
      const worksheet = workbook.Sheets['Change Management Plan'];
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      documents.changeManagement = data.filter(item => item['Change ID']);
    }
    
    console.log(`[${new Date().toISOString()}] Returning data from All_in_One_PM_Workbook.xlsx`);
    console.log(`  - RAID Log: ${documents.raidLog.length} items`);
    console.log(`  - Risk Register: ${documents.riskRegister.length} items`);
    console.log(`  - Project Plan: ${documents.projectPlan.length} tasks`);
    console.log(`  - Milestones: ${documents.milestoneTracker.length} milestones`);
    console.log(`  - Stakeholders: ${documents.stakeholderRegister.length} stakeholders`);
    res.json(documents);
  } catch (error) {
    console.error(`Error reading Excel file All_in_One_PM_Workbook.xlsx:`, error.message);
    res.status(500).json({ 
      error: `Failed to read project documents from All_in_One_PM_Workbook.xlsx. Make sure the file exists in the project root directory.` 
    });
  }
});

// ========== PROJECT SCOPE ENDPOINTS ==========

// Get project scope
app.get('/api/projects/:id/scope', authenticate, (req, res) => {
  const projectId = req.params.id;
  
  db.get(
    `SELECT scope_included, scope_excluded FROM project_scope WHERE project_id = ?`,
    [projectId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (!row) {
        return res.json({ 
          scope_included: '', 
          scope_excluded: '' 
        });
      }
      
      res.json({
        scope_included: row.scope_included || '',
        scope_excluded: row.scope_excluded || ''
      });
    }
  );
});

// Update project scope
app.put('/api/projects/:id/scope', authenticate, (req, res) => {
  const projectId = req.params.id;
  const { scope_included, scope_excluded } = req.body;
  
  db.get(
    `SELECT id FROM project_scope WHERE project_id = ?`,
    [projectId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (row) {
        // Update existing
        db.run(
          `UPDATE project_scope SET scope_included = ?, scope_excluded = ?, updated_at = CURRENT_TIMESTAMP WHERE project_id = ?`,
          [scope_included, scope_excluded, projectId],
          function(err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Scope updated successfully' });
          }
        );
      } else {
        // Insert new
        db.run(
          `INSERT INTO project_scope (project_id, scope_included, scope_excluded) VALUES (?, ?, ?)`,
          [projectId, scope_included, scope_excluded],
          function(err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Scope created successfully', id: this.lastID });
          }
        );
      }
    }
  );
});

// ========== AUTHENTICATION ENDPOINTS ==========

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  db.get(
    `SELECT u.*, r.name as role_name 
     FROM users u 
     LEFT JOIN roles r ON u.role_id = r.id 
     WHERE u.username = ? AND u.is_active = 1`,
    [username],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const validPassword = bcrypt.compareSync(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

      getUserPermissions(user.id, (permErr, permissions) => {
        const token = generateToken(user);
        res.json({
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role_name,
            role_id: user.role_id,
            permissions: permissions || []
          }
        });
      });
    }
  );
});

// Get current user
app.get('/api/auth/me', authenticate, (req, res) => {
  db.get(
    `SELECT u.id, u.username, u.email, u.role_id, u.is_active, u.last_login, u.created_at, r.name as role_name
     FROM users u 
     LEFT JOIN roles r ON u.role_id = r.id 
     WHERE u.id = ?`,
    [req.user.id],
    (err, user) => {
      if (err || !user) {
        return res.status(404).json({ error: 'User not found' });
      }

      getUserPermissions(user.id, (permErr, permissions) => {
        res.json({
          user: {
            ...user,
            permissions: permissions || []
          }
        });
      });
    }
  );
});

// ========== USER MANAGEMENT (Admin only) ==========

// Get all users
app.get('/api/users', authenticate, requireAdmin, (req, res) => {
  db.all(
    `SELECT u.id, u.username, u.email, u.is_active, u.last_login, u.created_at, 
            r.id as role_id, r.name as role_name
     FROM users u 
     LEFT JOIN roles r ON u.role_id = r.id 
     ORDER BY u.created_at DESC`,
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

// Create user
app.post('/api/users', authenticate, requireAdmin, (req, res) => {
  const { username, email, password, role_id, is_active } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  
  db.run(
    `INSERT INTO users (username, email, password, role_id, is_active) VALUES (?, ?, ?, ?, ?)`,
    [username, email, hashedPassword, role_id || null, is_active !== undefined ? is_active : 1],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ error: 'Username or email already exists' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, message: 'User created successfully' });
    }
  );
});

// Update user
app.put('/api/users/:id', authenticate, requireAdmin, (req, res) => {
  const { username, email, role_id, is_active, password } = req.body;
  const updates = [];
  const params = [];

  if (username) { updates.push('username = ?'); params.push(username); }
  if (email) { updates.push('email = ?'); params.push(email); }
  if (role_id !== undefined) { updates.push('role_id = ?'); params.push(role_id); }
  if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active); }
  if (password) { updates.push('password = ?'); params.push(bcrypt.hashSync(password, 10)); }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(req.params.id);

  db.run(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    params,
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ error: 'Username or email already exists' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.json({ changes: this.changes, message: 'User updated successfully' });
    }
  );
});

// Delete user
app.delete('/api/users/:id', authenticate, requireAdmin, (req, res) => {
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  db.run('DELETE FROM users WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ changes: this.changes, message: 'User deleted successfully' });
  });
});

// ========== ROLE MANAGEMENT (Admin only) ==========

// Get all roles with permissions
app.get('/api/roles', authenticate, requireAdmin, (req, res) => {
  db.all('SELECT * FROM roles ORDER BY name', (err, roles) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    db.all(
      `SELECT rp.role_id, p.id as permission_id, p.name, p.description, p.resource, p.action
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id`,
      (permErr, permissions) => {
        if (permErr) {
          return res.status(500).json({ error: permErr.message });
        }
        
        const rolesWithPerms = roles.map(role => ({
          ...role,
          permissions: permissions.filter(p => p.role_id === role.id)
        }));
        
        res.json(rolesWithPerms);
      }
    );
  });
});

// Get all permissions
app.get('/api/permissions', authenticate, requireAdmin, (req, res) => {
  db.all('SELECT * FROM permissions ORDER BY resource, action', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Create role
app.post('/api/roles', authenticate, requireAdmin, (req, res) => {
  const { name, description, permission_ids } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Role name is required' });
  }

  db.run(
    'INSERT INTO roles (name, description) VALUES (?, ?)',
    [name, description || ''],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ error: 'Role name already exists' });
        }
        return res.status(500).json({ error: err.message });
      }
      
      const roleId = this.lastID;
      
      if (permission_ids && permission_ids.length > 0) {
        const stmt = db.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
        permission_ids.forEach(permId => {
          stmt.run(roleId, permId);
        });
        stmt.finalize();
      }
      
      res.json({ id: roleId, message: 'Role created successfully' });
    }
  );
});

// Update role
app.put('/api/roles/:id', authenticate, requireAdmin, (req, res) => {
  const { name, description, permission_ids } = req.body;
  const roleId = req.params.id;
  
  const updates = [];
  const params = [];
  
  if (name) { updates.push('name = ?'); params.push(name); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  
  if (updates.length > 0) {
    params.push(roleId);
    db.run(
      `UPDATE roles SET ${updates.join(', ')} WHERE id = ?`,
      params,
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Role name already exists' });
          }
          return res.status(500).json({ error: err.message });
        }
      }
    );
  }
  
  if (permission_ids) {
    db.run('DELETE FROM role_permissions WHERE role_id = ?', [roleId], (err) => {
      if (!err && permission_ids.length > 0) {
        const stmt = db.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
        permission_ids.forEach(permId => {
          stmt.run(roleId, permId);
        });
        stmt.finalize();
      }
    });
  }
  
  res.json({ message: 'Role updated successfully' });
});

// Delete role
app.delete('/api/roles/:id', authenticate, requireAdmin, (req, res) => {
  db.run('DELETE FROM roles WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ changes: this.changes, message: 'Role deleted successfully' });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
