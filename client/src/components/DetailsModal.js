import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import './DetailsModal.css';

function DetailsModal({ project, onClose, onSave }) {
  const [formData, setFormData] = useState({
    owner: '',
    vertical: '',
    region: 'Global',
    sponsor: '',
    anchor_customer: '',
    clients: '',
    priority: 'P0',
    status: 'Demo',
    mcc: 'Internal'
  });

  useEffect(() => {
    if (project) {
      setFormData({
        owner: project.owner || '',
        vertical: project.vertical || '',
        region: project.region || 'Global',
        sponsor: project.sponsor || '',
        anchor_customer: project.anchor_customer || '',
        clients: project.clients || '',
        priority: project.priority || 'P0',
        status: project.status || 'Demo',
        mcc: project.mcc || 'Internal'
      });
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
      <div className="modal details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Details</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="details-form">
          <div className="form-group">
            <label>OWNER</label>
            <input
              type="text"
              name="owner"
              value={formData.owner}
              onChange={handleChange}
              placeholder="e.g. Krish Sharma"
            />
          </div>

          <div className="form-group">
            <label>VERTICAL</label>
            <input
              type="text"
              name="vertical"
              value={formData.vertical}
              onChange={handleChange}
              placeholder="e.g. Pharma & Biotech"
            />
          </div>

          <div className="form-group">
            <label>REGION</label>
            <select
              name="region"
              value={formData.region}
              onChange={handleChange}
            >
              <option value="Global">Global</option>
              <option value="North America">North America</option>
              <option value="Europe">Europe</option>
              <option value="Asia Pacific">Asia Pacific</option>
              <option value="Latin America">Latin America</option>
              <option value="Middle East">Middle East</option>
            </select>
          </div>

          <div className="form-group">
            <label>SPONSOR</label>
            <input
              type="text"
              name="sponsor"
              value={formData.sponsor}
              onChange={handleChange}
              placeholder="e.g. Saurabh"
            />
          </div>

          <div className="form-group">
            <label>ANCHOR CUSTOMER</label>
            <input
              type="text"
              name="anchor_customer"
              value={formData.anchor_customer}
              onChange={handleChange}
              placeholder="e.g. Red Rhino"
            />
          </div>

          <div className="form-group">
            <label>CUSTOMER ENGAGEMENT</label>
            <input
              type="text"
              name="clients"
              value={formData.clients}
              onChange={handleChange}
              placeholder="e.g. BMS, Jazz Pharmaceuticals"
            />
          </div>

          <div className="form-group">
            <label>PRIORITY</label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
            >
              <option value="P0">P0</option>
              <option value="P1">P1</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
            </select>
          </div>

          <div className="form-group">
            <label>STATUS</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="Demo">Demo</option>
              <option value="Active">Active</option>
              <option value="On-track">On-track</option>
              <option value="Development">Development</option>
              <option value="Complete">Complete</option>
              <option value="On-hold">On-hold</option>
            </select>
          </div>

          <div className="form-group">
            <label>MODE OF ENGAGEMENT</label>
            <select
              name="mcc"
              value={formData.mcc}
              onChange={handleChange}
            >
              <option value="Internal">Internal</option>
              <option value="External">External</option>
              <option value="Partnership">Partnership</option>
              <option value="Consulting">Consulting</option>
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-changes-btn">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DetailsModal;
