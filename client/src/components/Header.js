import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Upload, LogOut, User, Shield, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Header.css';

function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout, hasPermission, isAdmin } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <div className="logo">
            <span className="logo-text">ZapCom</span>
          </div>
          {isAuthenticated && (
            <nav className="nav">
              {hasPermission('projects', 'view') && (
                <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
                  Portfolio
                </Link>
              )}
              <a href="#" className="nav-link">Data Studio</a>
              <a href="#" className="nav-link">Ask AI</a>
              <a href="#" className="nav-link">Resources</a>
              <a href="#" className="nav-link">Knowledge Base</a>
              {isAdmin() && (
                <div className="nav-dropdown">
                  <span className="nav-link">
                    <Shield size={16} />
                    Admin
                    <ChevronDown size={14} />
                  </span>
                  <div className="dropdown-menu">
                    <Link to="/admin/users" className={location.pathname === '/admin/users' ? 'active' : ''}>
                      <User size={14} />
                      Users
                    </Link>
                    <Link to="/admin/roles" className={location.pathname === '/admin/roles' ? 'active' : ''}>
                      <Shield size={14} />
                      Roles
                    </Link>
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
    </header>
  );
}

export default Header;
