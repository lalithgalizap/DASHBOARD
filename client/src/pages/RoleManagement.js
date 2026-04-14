import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Plus, Edit2, Trash2, Check, RefreshCw } from 'lucide-react';
import './Admin.css';

const RoleManagement = () => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permission_ids: []
  });

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await axios.get('/api/roles');
      setRoles(response.data);
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await axios.get('/api/permissions');
      setPermissions(response.data);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRole) {
        await axios.put(`/api/roles/${editingRole.id}`, formData);
      } else {
        await axios.post('/api/roles', formData);
      }
      setShowModal(false);
      setEditingRole(null);
      resetForm();
      fetchRoles();
    } catch (error) {
      alert(error.response?.data?.error || 'Error saving role');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this role? Users with this role will lose their permissions.')) {
      try {
        await axios.delete(`/api/roles/${id}`);
        fetchRoles();
      } catch (error) {
        alert(error.response?.data?.error || 'Error deleting role');
      }
    }
  };

  const handleEdit = (role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      permission_ids: role.permissions?.map(p => p.permission_id) || []
    });
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingRole(null);
    resetForm();
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      permission_ids: []
    });
  };

  const togglePermission = (permId) => {
    const currentIds = formData.permission_ids;
    if (currentIds.includes(permId)) {
      setFormData({
        ...formData,
        permission_ids: currentIds.filter(id => id !== permId)
      });
    } else {
      setFormData({
        ...formData,
        permission_ids: [...currentIds, permId]
      });
    }
  };

  const getPermissionsByPage = () => {
    // Map permissions to pages (frontend-only organization)
    const pageMapping = {
      'Dashboard': ['view_dashboard'],
      'Projects': ['view_projects', 'add_delete_projects', 'edit_projects', 'manage_import', 'manage_closure_docs'],
      'Portfolio': ['view_portfolio', 'manage_portfolio'],
      'User Management': ['view_users', 'manage_users'],
      'Role Management': ['view_roles', 'manage_roles']
    };
    
    const grouped = {};
    permissions.forEach(perm => {
      // Find which page this permission belongs to
      for (const [page, permNames] of Object.entries(pageMapping)) {
        if (permNames.includes(perm.permission_name)) {
          if (!grouped[page]) {
            grouped[page] = [];
          }
          grouped[page].push(perm);
          break;
        }
      }
    });
    
    // Return in consistent order
    const ordered = {};
    Object.keys(pageMapping).forEach(page => {
      if (grouped[page]) {
        ordered[page] = grouped[page];
      }
    });
    return ordered;
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <RefreshCw className="spin" size={32} />
        <p>Loading roles...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div className="admin-title">
          <Shield size={24} />
          <h1>Role Management</h1>
        </div>
        <button className="btn-primary" onClick={handleAdd}>
          <Plus size={18} />
          Add Role
        </button>
      </div>

      <div className="roles-grid">
        {roles.map(role => (
          <div key={role.id} className="role-card">
            <div className="role-card-header">
              <h3>{role.name}</h3>
              <div className="role-actions">
                <button
                  className="btn-icon"
                  onClick={() => handleEdit(role)}
                  title="Edit"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  className="btn-icon btn-danger"
                  onClick={() => handleDelete(role.id)}
                  title="Delete"
                  disabled={['Admin', 'PM', 'PMO', 'CSP', 'Managers', 'SLTs', 'Superuser'].includes(role.name)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <p className="role-description">{role.description || 'No description'}</p>
            <div className="role-permissions">
              <h4>Permissions ({role.permissions?.length || 0})</h4>
              <div className="permission-tags">
                {role.permissions?.slice(0, 6).map(perm => (
                  <span key={perm.permission_id} className="permission-tag">
                    {perm.resource}:{perm.action}
                  </span>
                ))}
                {role.permissions?.length > 6 && (
                  <span className="permission-tag more">
                    +{role.permissions.length - 6} more
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <h2>{editingRole ? 'Edit Role' : 'Add New Role'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Role Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="permissions-section">
                <label>Permissions by Page</label>
                <div className="permissions-by-resource">
                  {Object.entries(getPermissionsByPage()).map(([page, perms]) => (
                    <div key={page} className="resource-group">
                      <h4>{page}</h4>
                      <div className="permission-checkboxes">
                        {perms.map(perm => (
                          <label key={perm.id} className="permission-checkbox">
                            <input
                              type="checkbox"
                              checked={formData.permission_ids.includes(perm.id)}
                              onChange={() => togglePermission(perm.id)}
                            />
                            <span className="checkmark">
                              {formData.permission_ids.includes(perm.id) ? <Check size={12} /> : null}
                            </span>
                            <span className="perm-name">{perm.action}</span>
                            <span className="perm-desc">{perm.description}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingRole ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;
