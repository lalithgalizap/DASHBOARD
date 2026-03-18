const jwt = require('jsonwebtoken');
const db = require('./database');

const JWT_SECRET = process.env.JWT_SECRET || 'pmo-dashboard-secret-key-2024';

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

const requirePermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Access denied. Not authenticated.' });
    }

    const userId = req.user.id;
    
    db.get(
      `SELECT r.id as role_id, p.id as permission_id
       FROM users u
       JOIN roles r ON u.role_id = r.id
       JOIN role_permissions rp ON r.id = rp.role_id
       JOIN permissions p ON rp.permission_id = p.id
       WHERE u.id = ? AND u.is_active = 1 AND p.resource = ? AND p.action = ?`,
      [userId, resource, action],
      (err, row) => {
        if (err) {
          return res.status(500).json({ error: 'Error checking permissions.' });
        }
        
        if (!row) {
          return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
        }
        
        next();
      }
    );
  };
};

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Access denied. Not authenticated.' });
  }

  db.get(
    `SELECT r.name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
    [req.user.id],
    (err, row) => {
      if (err || !row || row.name !== 'Admin') {
        return res.status(403).json({ error: 'Access denied. Admin required.' });
      }
      next();
    }
  );
};

const getUserPermissions = (userId, callback) => {
  db.all(
    `SELECT p.name, p.resource, p.action
     FROM users u
     JOIN roles r ON u.role_id = r.id
     JOIN role_permissions rp ON r.id = rp.role_id
     JOIN permissions p ON rp.permission_id = p.id
     WHERE u.id = ? AND u.is_active = 1`,
    [userId],
    (err, rows) => {
      if (err) {
        callback(err, null);
        return;
      }
      callback(null, rows);
    }
  );
};

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email, role_id: user.role_id },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

module.exports = {
  authenticate,
  requirePermission,
  requireAdmin,
  getUserPermissions,
  generateToken,
  JWT_SECRET
};
