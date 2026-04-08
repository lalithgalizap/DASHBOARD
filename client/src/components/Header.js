import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, User, Shield, ChevronDown, Key } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ChangePasswordModal from './ChangePasswordModal';
import './Header.css';

function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout, hasPermission, isAdmin } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Don't show header on login page
  if (location.pathname === '/login') return null;

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <div className="logo">
            <img src="/LOGO.png" alt="Logo" style={{ height: '32px', width: 'auto' }} />
            <span className="logo-text">PMO Dashboard</span>
          </div>
          {isAuthenticated && (
            <nav className="nav">
              {hasPermission('projects', 'view') && (
                <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
                  Projects
                </Link>
              )}
              {hasPermission('portfolio', 'view') && (
                <Link to="/portfolio" className={`nav-link ${location.pathname === '/portfolio' ? 'active' : ''}`}>
                  Portfolio
                </Link>
              )}
              {hasPermission('portfolio', 'manage') && (
                <button className="nav-link" onClick={(e) => e.preventDefault()}>
                  Performance
                </button>
              )}
              {hasPermission('users', 'view') && (
                <button className="nav-link" onClick={(e) => e.preventDefault()}>
                  Staff Augmentation
                </button>
              )}
              {(hasPermission('users', 'manage') || hasPermission('roles', 'manage')) && (
                <div className="nav-dropdown">
                  <span className="nav-link">
                    <Shield size={16} />
                    Admin
                    <ChevronDown size={14} />
                  </span>
                  <div className="dropdown-menu">
                    {hasPermission('users', 'manage') && (
                      <Link to="/admin/users" className={location.pathname === '/admin/users' ? 'active' : ''}>
                        <User size={14} />
                        Users
                      </Link>
                    )}
                    {hasPermission('roles', 'manage') && (
                      <Link to="/admin/roles" className={location.pathname === '/admin/roles' ? 'active' : ''}>
                        <Shield size={14} />
                        Roles
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </nav>
          )}
        </div>
        <div className="header-right">
          {isAuthenticated ? (
            <div className="user-section">
              <span className="user-name">{user?.username}</span>
              <span className="user-role">{user?.role}</span>
              {!isAdmin() && (
                <button 
                  className="change-password-btn" 
                  onClick={() => setShowChangePassword(true)}
                  title="Change Password"
                >
                  <Key size={16} />
                </button>
              )}
              <button className="logout-btn" onClick={handleLogout} title="Logout">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            location.pathname !== '/login' && (
              <Link to="/login" className="login-link">
                Sign In
              </Link>
            )
          )}
        </div>
      </div>

      {showChangePassword && (
        <ChangePasswordModal
          onClose={() => setShowChangePassword(false)}
        />
      )}
    </header>
  );
}

export default Header;
