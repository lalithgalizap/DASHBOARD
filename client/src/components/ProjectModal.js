import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import './ProjectModal.css';

function ProjectModal({ project, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    summary: '',
    status: 'Yet to Start',
    clients: ''
  });

  useEffect(() => {
    if (project) {
      setFormData(project);
    }
  }, [project]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal project-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{project ? 'Edit Project' : 'New Project'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="project-form">
          <div className="form-group">
            <label>Project Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter project name"
            />
          </div>

          <div className="form-group">
            <label>Status</label>
            <select name="status" value={formData.status} onChange={handleChange}>
              <option value="Yet to Start">Yet to Start</option>
              <option value="On Track">On Track</option>
              <option value="On Hold">On Hold</option>
              <option value="Delayed">Delayed</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="form-group">
            <label>Summary</label>
            <textarea
              name="summary"
              value={formData.summary}
              onChange={handleChange}
              rows="3"
              placeholder="Project summary"
            />
          </div>

          <div className="form-group">
            <label>Clients</label>
            <input
              type="text"
              name="clients"
              value={formData.clients}
              onChange={handleChange}
              placeholder="Client names"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-btn">
              {project ? 'Update' : 'Create'} Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProjectModal;
