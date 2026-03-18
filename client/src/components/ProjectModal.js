import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import './ProjectModal.css';

function ProjectModal({ project, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    priority: 'P2',
    stage: 'Initial Phase',
    summary: '',
    status: 'Active',
    clients: '',
    links: ''
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

          <div className="form-row">
            <div className="form-group">
              <label>Priority</label>
              <select name="priority" value={formData.priority} onChange={handleChange}>
                <option value="P0">P0</option>
                <option value="P1">P1</option>
                <option value="P2">P2</option>
                <option value="P3">P3</option>
              </select>
            </div>

            <div className="form-group">
              <label>Progress</label>
              <select name="stage" value={formData.stage} onChange={handleChange}>
                <option value="Initial Phase">Initial Phase</option>
                <option value="On-Track">On-Track</option>
                <option value="Delayed">Delayed</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Status</label>
            <select name="status" value={formData.status} onChange={handleChange}>
              <option value="Active">Active</option>
              <option value="On-Hold">On-Hold</option>
              <option value="Completed">Completed</option>
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

          <div className="form-group">
            <label>Links</label>
            <input
              type="url"
              name="links"
              value={formData.links}
              onChange={handleChange}
              placeholder="https://..."
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
