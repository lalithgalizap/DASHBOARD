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
    const projectName = req.query.projectName || 'test';
    const excelFileName = `${projectName}.xlsx`;
    const excelFilePath = path.join(__dirname, excelFileName);
    console.log(`[${new Date().toISOString()}] Reading Excel file: ${excelFilePath} for project ${req.params.id}...`);
    
    const workbook = XLSX.readFile(excelFilePath);
    
    const documents = {
      raidLog: [],
      raidDashboard: {},
      raidInsights: {},
      riskManagement: {}
    };
    
    // Read RAID Log sheet - limit to first 20 actual records
    if (workbook.SheetNames.includes('RAID Log')) {
      const worksheet = workbook.Sheets['RAID Log'];
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      // Filter to only valid RAID entries (first 20 based on dashboard)
      documents.raidLog = data.filter(item => 
        item['RAID ID'] && 
        item['RAID ID'] <= 20 &&
        item.Type && 
        item.Title
      );
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
    
    // Read RAID Insights sheet
    if (workbook.SheetNames.includes('RAID Insights')) {
      const worksheet = workbook.Sheets['RAID Insights'];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      documents.raidInsights = {
        totalOpenRAIDs: data[4] ? data[4][0] : 0,
        overdueIssues: data[4] ? data[4][3] : 0,
        openRisks: data[4] ? data[4][6] : 0,
        openIssues: data[4] ? data[4][9] : 0,
        openDependencies: data[4] ? data[4][12] : 0,
        rawData: data
      };
    }
    
    // Read Risk Management Dashboard sheet
    if (workbook.SheetNames.includes('Risk Management Dashboard')) {
      const worksheet = workbook.Sheets['Risk Management Dashboard'];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      documents.riskManagement = {
        projectName: data[0] ? data[0][2] : '',
        rawData: data
      };
    }
    
    console.log(`[${new Date().toISOString()}] Returning ${documents.raidLog.length} RAID items`);
    res.json(documents);
  } catch (error) {
    const projectName = req.query.projectName || 'test';
    const excelFileName = `${projectName}.xlsx`;
    console.error(`Error reading Excel file ${excelFileName}:`, error.message);
    res.status(500).json({ 
      error: `Failed to read project documents from ${excelFileName}. Make sure the file exists in the server directory.` 
    });
  }
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
