const jwt = require('jsonwebtoken');
const dbAdapter = require('./dbAdapter');

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
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Access denied. Not authenticated.' });
    }

    try {
      const userId = req.user.id;
      const permissions = await dbAdapter.getUserPermissions(userId);
      
      // Permission names are like: "view_projects", "manage_projects"
      // We need to match: action_resource (e.g., "view" + "_" + "projects")
      const requiredPermission = `${action}_${resource}`;
      const hasPermission = permissions.includes(requiredPermission);
      
      if (!hasPermission) {
        console.log(`Permission denied: User ${userId} needs '${requiredPermission}', has:`, permissions);
        return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
      }
      
      next();
    } catch (err) {
      console.error('Permission check error:', err);
      return res.status(500).json({ error: 'Error checking permissions.' });
    }
  };
};

const requireAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Access denied. Not authenticated.' });
  }

  try {
    const user = await dbAdapter.getUserById(req.user.id);
    if (!user || !user.role_id) {
      return res.status(403).json({ error: 'Access denied. Admin required.' });
    }
    
    const role = await dbAdapter.getRoleByName('Admin');
    if (!role || user.role_id !== role.id) {
      return res.status(403).json({ error: 'Access denied. Admin required.' });
    }
    
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Error checking admin status.' });
  }
};

const getUserPermissions = async (userId, callback) => {
  try {
    const permissions = await dbAdapter.getUserPermissions(userId);
    if (callback) {
      callback(null, permissions);
    }
    return permissions;
  } catch (err) {
    if (callback) {
      callback(err, null);
    }
    throw err;
  }
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
