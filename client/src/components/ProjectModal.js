import React, { useState, useEffect } from 'react';
import { X, ChevronDown, Search, Plus, X as XIcon } from 'lucide-react';
import axios from 'axios';
import './ProjectModal.css';

function ProjectModal({ project, onClose, onSave, isAdmin }) {
  console.log('ProjectModal - isAdmin prop:', isAdmin, 'type:', typeof isAdmin);
  
  const [formData, setFormData] = useState({
    name: '',
    summary: '',
    status: 'Yet to Start',
    clients: []
  });
  const [allClients, setAllClients] = useState([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [newClientInput, setNewClientInput] = useState('');

  useEffect(() => {
    fetchAllClients();
  }, []);

  useEffect(() => {
    if (project) {
      setFormData({
        ...project,
        clients: project.clients ? project.clients.split(',').map(c => c.trim()).filter(c => c) : []
      });
    }
  }, [project]);

  const fetchAllClients = async () => {
    try {
      const response = await axios.get('/api/projects');
      const projects = response.data;
      const clientsSet = new Set();
      projects.forEach(p => {
        if (p.clients) {
          p.clients.split(',').forEach(client => {
            const trimmed = client.trim();
            if (trimmed) clientsSet.add(trimmed);
          });
        }
      });
      setAllClients(Array.from(clientsSet).sort());
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const addClient = (client) => {
    if (!formData.clients.includes(client)) {
      setFormData({
        ...formData,
        clients: [...formData.clients, client]
      });
    }
    setClientSearch('');
    setNewClientInput('');
  };

  const removeClient = (client) => {
    setFormData({
      ...formData,
      clients: formData.clients.filter(c => c !== client)
    });
  };

  const handleAddNewClient = () => {
    const newClient = newClientInput.trim() || clientSearch.trim();
    if (newClient && !formData.clients.includes(newClient)) {
      addClient(newClient);
    }
  };

  const filteredClients = allClients.filter(client =>
    client.toLowerCase().includes(clientSearch.toLowerCase()) &&
    !formData.clients.includes(client)
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      clients: formData.clients.join(', ')
    });
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
            {isAdmin === true ? (
              <div className="client-select-container">
                <div className="selected-clients">
                  {formData.clients.map(client => (
                    <span key={client} className="client-tag">
                      {client}
                      <button type="button" onClick={() => removeClient(client)} className="remove-client">
                        <XIcon size={14} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="client-dropdown-wrapper">
                  <div
                    className="client-input-wrapper"
                    onClick={() => setShowClientDropdown(!showClientDropdown)}
                  >
                    <Search size={16} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search or add new client..."
                      value={clientSearch || newClientInput}
                      onChange={(e) => {
                        setClientSearch(e.target.value);
                        setNewClientInput(e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="client-search-input"
                    />
                    <ChevronDown size={16} className={`dropdown-arrow ${showClientDropdown ? 'open' : ''}`} />
                  </div>
                  {showClientDropdown && (
                    <div className="client-dropdown">
                      {filteredClients.length > 0 ? (
                        filteredClients.map(client => (
                          <div
                            key={client}
                            className="client-option"
                            onClick={() => {
                              addClient(client);
                              setShowClientDropdown(false);
                            }}
                          >
                            {client}
                          </div>
                        ))
                      ) : (
                        <div className="client-option no-results">
                          No existing clients found
                        </div>
                      )}
                      {(clientSearch.trim() || newClientInput.trim()) && !formData.clients.includes(clientSearch.trim() || newClientInput.trim()) && (
                        <div
                          className="client-option add-new"
                          onClick={() => {
                            handleAddNewClient();
                            setShowClientDropdown(false);
                          }}
                        >
                          <Plus size={14} />
                          Add "{clientSearch || newClientInput}" as new client
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="clients-readonly">
                {formData.clients.length > 0 ? (
                  formData.clients.map(client => (
                    <span key={client} className="client-tag readonly">{client}</span>
                  ))
                ) : (
                  <span className="no-clients">No clients assigned</span>
                )}
              </div>
            )}
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
