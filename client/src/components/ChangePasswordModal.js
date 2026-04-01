import React, { useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import './ChangePasswordModal.css';

function ChangePasswordModal({ onClose }) {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setSuccess('');
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword({
      ...showPassword,
      [field]: !showPassword[field]
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New password and confirm password do not match');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.post('/api/auth/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });
      
      setSuccess('Password changed successfully!');
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal change-password-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Change Password</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="change-password-form">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="form-group">
            <label>Current Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword.current ? 'text' : 'password'}
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder="Enter current password"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => togglePasswordVisibility('current')}
              >
                {showPassword.current ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>New Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword.new ? 'text' : 'password'}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="Enter new password"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => togglePasswordVisibility('new')}
              >
                {showPassword.new ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Confirm New Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword.confirm ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm new password"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => togglePasswordVisibility('confirm')}
              >
                {showPassword.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="save-btn"
              disabled={loading}
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChangePasswordModal;
