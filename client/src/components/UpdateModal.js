import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';
import './UpdateModal.css';

function UpdateModal({ update, onClose, onSave }) {
  const [projects, setProjects] = useState([]);
  const [formData, setFormData] = useState({
    project_id: '',
    project_name: '',
    stage: '',
    week_date: '',
    name: '',
    rag: 'None',
    update_text: '',
    next_steps: '',
    blockers: '',
    customer_engagement: '',
    milestone_achieved: '',
    momentum: 'Select'
  });

  useEffect(() => {
    fetchProjects();
    
    const today = new Date();
    const year = today.getFullYear();
    const week = getWeekNumber(today);
    
    if (update) {
      // If update has an id, it's an existing update being edited
      if (update.id) {
        setFormData(update);
      } else {
        // If update has project_id but no id, it's a new update with pre-selected project
        setFormData(prev => ({
          ...prev,
          project_id: update.project_id || '',
          project_name: update.project_name || '',
          stage: update.stage || '',
          week_date: `${year}-W${week.toString().padStart(2, '0')}`
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        week_date: `${year}-W${week.toString().padStart(2, '0')}`
      }));
    }
  }, [update]);

  const fetchProjects = async () => {
    try {
      const response = await axios.get('/api/projects');
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  const handleProjectChange = (e) => {
    const projectId = e.target.value;
    const selectedProject = projects.find(p => p.id === projectId);
    
    if (selectedProject) {
      setFormData({
        ...formData,
        project_id: selectedProject.id,
        project_name: selectedProject.name,
        stage: selectedProject.stage
      });
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.project_name) {
      alert('Please select a project');
      return;
    }
    
    if (!formData.week_date) {
      alert('Please select a week');
      return;
    }

    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal update-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{update ? 'Edit Weekly Update' : 'Add Weekly Update'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="update-form">
          <div className="form-group">
            <label>Project *</label>
            <select
              name="project_id"
              value={formData.project_id}
              onChange={handleProjectChange}
              required
              disabled={update && update.project_id && !update.id}
            >
              <option value="">Select project</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            {update && update.project_id && !update.id && (
              <span style={{ fontSize: '12px', color: '#71717a', marginTop: '4px', display: 'block' }}>
                Project is pre-selected for this update
              </span>
            )}
          </div>

          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your name"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Week *</label>
              <input
                type="week"
                name="week_date"
                value={formData.week_date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>RAG</label>
              <select
                name="rag"
                value={formData.rag}
                onChange={handleChange}
              >
                <option value="None">None</option>
                <option value="Red">Red</option>
                <option value="Amber">Amber</option>
                <option value="Green">Green</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Weekly Update *</label>
            <textarea
              name="update_text"
              value={formData.update_text}
              onChange={handleChange}
              rows="4"
              placeholder="What happened this week?"
              required
            />
          </div>

          <div className="form-group">
            <label>Next Steps</label>
            <textarea
              name="next_steps"
              value={formData.next_steps}
              onChange={handleChange}
              rows="3"
              placeholder="What's planned next?"
            />
          </div>

          <div className="form-group">
            <label>Blockers</label>
            <textarea
              name="blockers"
              value={formData.blockers}
              onChange={handleChange}
              rows="3"
              placeholder="Any blockers or risks?"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Milestone Achieved</label>
              <input
                type="text"
                name="milestone_achieved"
                value={formData.milestone_achieved}
                onChange={handleChange}
                placeholder="e.g. MVP launched, First demo done..."
              />
            </div>

            <div className="form-group">
              <label>Customer Engagement this Week</label>
              <input
                type="text"
                name="customer_engagement"
                value={formData.customer_engagement}
                onChange={handleChange}
                placeholder="e.g. Demo with NBLX"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Momentum</label>
            <select
              name="momentum"
              value={formData.momentum}
              onChange={handleChange}
            >
              <option value="Select">Select</option>
              <option value="Accelerating">Accelerating</option>
              <option value="Steady">Steady</option>
              <option value="Slowing">Slowing</option>
              <option value="Stalled">Stalled</option>
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-update-btn">
              {update ? 'Update' : 'Save Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UpdateModal;
