import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronRight, Plus } from 'lucide-react';
import UpdateModal from './UpdateModal';
import { useAuth } from '../contexts/AuthContext';
import './WeeklyUpdates.css';

function WeeklyUpdates() {
  const { hasPermission } = useAuth();
  const [updates, setUpdates] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [selectedProject, setSelectedProject] = useState('All Projects');
  const [loading, setLoading] = useState(true);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState(null);

  useEffect(() => {
    fetchUpdates();
  }, [selectedWeek, selectedProject]);

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/weekly-updates', {
        params: { week: selectedWeek, project: selectedProject }
      });
      setUpdates(response.data);
    } catch (error) {
      console.error('Error fetching updates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUpdate = async (updateData) => {
    try {
      if (editingUpdate) {
        await axios.put(`/api/weekly-updates/${editingUpdate.id}`, updateData);
      } else {
        await axios.post('/api/weekly-updates', updateData);
      }
      setShowUpdateModal(false);
      setEditingUpdate(null);
      fetchUpdates();
    } catch (error) {
      console.error('Error saving update:', error);
      alert('Error saving update. Please try again.');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Advance': '#3b82f6',
      'Scale': '#10b981',
      'Incubate': '#8b5cf6',
      'Maintain': '#f59e0b'
    };
    return colors[status] || '#71717a';
  };

  return (
    <div className="weekly-updates-page">
      <div className="weekly-updates-header">
        <div className="header-left">
          <h1>Weekly Updates</h1>
          <p className="subtitle">Track challenges and wins for all projects</p>
        </div>
        <div className="header-right">
          <input 
            type="week" 
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="week-picker"
          />
          <select 
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="project-filter"
          >
            <option>All Projects</option>
            <option>Contact Graph</option>
            <option>TextBot MCP</option>
            <option>Voca.AI</option>
          </select>
          {hasPermission('updates', 'manage') && (
            <button className="add-update-btn" onClick={() => {
              setEditingUpdate(null);
              setShowUpdateModal(true);
            }}>
              <Plus size={16} />
              Add Update
            </button>
          )}
        </div>
      </div>

      <div className="updates-container">
        {loading ? (
          <div className="loading">Loading updates...</div>
        ) : updates.length === 0 ? (
          <div className="empty-state">
            <p>No updates found for the selected filters.</p>
          </div>
        ) : (
          updates.map((update) => (
            <div key={update.id} className="update-card">
              <div className="update-card-header">
                <div className="card-header-left">
                  <h3>{update.project_name}</h3>
                  {update.name && (
                    <span className="update-author">by {update.name}</span>
                  )}
                </div>
                <div className="card-header-actions">
                  <span 
                    className="stage-badge"
                    style={{ 
                      backgroundColor: `${getStatusColor(update.stage)}20`, 
                      color: getStatusColor(update.stage) 
                    }}
                  >
                    {update.stage}
                  </span>
                  <span className="update-date">{update.week_date}</span>
                  <ChevronRight size={16} className="expand-icon" />
                </div>
              </div>

              <div className="update-sections">
                <div className="update-section">
                  <h4>UPDATE</h4>
                  <p>{update.update_text || 'No update provided'}</p>
                </div>

                <div className="update-section">
                  <h4>NEXT STEPS</h4>
                  <p>{update.next_steps || 'No next steps defined'}</p>
                </div>

                <div className="update-section">
                  <h4>BLOCKERS</h4>
                  <p>{update.blockers || 'No blockers'}</p>
                </div>

                <div className="update-section">
                  <h4>CUSTOMER ENGAGEMENT</h4>
                  <p>{update.customer_engagement || 'N/A'}</p>
                </div>

                <div className="update-section">
                  <h4>TRACTION</h4>
                  <p>{update.traction || 'N/A'}</p>
                </div>

                {update.objective && (
                  <div className="update-section">
                    <h4>OBJECTIVE</h4>
                    <p>{update.objective}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showUpdateModal && (
        <UpdateModal
          update={editingUpdate}
          onClose={() => {
            setShowUpdateModal(false);
            setEditingUpdate(null);
          }}
          onSave={handleSaveUpdate}
        />
      )}
    </div>
  );
}

export default WeeklyUpdates;
