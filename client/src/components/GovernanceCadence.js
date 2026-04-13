import React, { useState } from 'react';
import './ProjectDocuments.css';

function GovernanceCadence({ documents }) {
  const [selectedGovernance, setSelectedGovernance] = useState(null);
  const [showGovernanceModal, setShowGovernanceModal] = useState(false);
  const [governanceSearch, setGovernanceSearch] = useState('');

  if (!documents?.governanceCadences || documents.governanceCadences.length === 0) {
    return (
      <div className="document-content">
        <h3>Governance & Cadences</h3>
        <p className="placeholder-text">No governance cadence data available.</p>
      </div>
    );
  }

  // Get all columns from governance data
  const allColumns = documents.governanceCadences.reduce((cols, g) => {
    Object.keys(g).forEach(key => {
      if (!cols.includes(key)) cols.push(key);
    });
    return cols;
  }, []);

  // Open governance detail modal
  const openGovernanceModal = (governance) => {
    setSelectedGovernance(governance);
    setShowGovernanceModal(true);
  };

  // Format Excel serial date to readable date
  const formatExcelDate = (value) => {
    if (!value) return '-';
    // Check if it's an Excel serial date (number > 30000, typical Excel date range)
    if (typeof value === 'number' && value > 30000 && value < 60000) {
      // Excel dates are days since 1899-12-30
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
      return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
    }
    // If already a string date, return as-is
    return value;
  };

  // Render governance detail modal
  const renderGovernanceDetailModal = () => {
    if (!showGovernanceModal || !selectedGovernance) return null;

    return (
      <div className="category-modal-overlay" onClick={() => setShowGovernanceModal(false)}>
        <div className="category-modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '700px', maxHeight: '80vh', overflow: 'auto'}}>
          <div className="category-modal-header">
            <h3>
              <span className="category-color-indicator" style={{ backgroundColor: '#3b82f6' }} />
              Governance Details: {selectedGovernance['Forum / Meeting Name'] || selectedGovernance['Meeting Name'] || selectedGovernance['Meeting Type']}
            </h3>
            <button className="modal-close-btn" onClick={() => setShowGovernanceModal(false)}>✕</button>
          </div>
          <div className="category-modal-content">
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', padding: '16px'}}>
              {allColumns.map((col, idx) => (
                <div key={idx} style={{
                  display: 'flex', 
                  flexDirection: 'column', 
                  padding: '12px', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '8px',
                  border: '1px solid #e9ecef'
                }}>
                  <label style={{fontSize: '11px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px'}}>{col}</label>
                  <span style={{fontSize: '14px', fontWeight: '500'}}>{formatExcelDate(selectedGovernance[col])}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Filter governance based on search
  const filteredGovernance = governanceSearch.trim() === '' 
    ? documents.governanceCadences 
    : documents.governanceCadences.filter(g => {
        const searchTerm = governanceSearch.toLowerCase();
        return (
          String(g['Forum / Meeting Name'] || g['Meeting Name'] || '').toLowerCase().includes(searchTerm) ||
          String(g['Meeting Type'] || '').toLowerCase().includes(searchTerm) ||
          String(g['Frequency'] || '').toLowerCase().includes(searchTerm) ||
          String(g['Status'] || '').toLowerCase().includes(searchTerm)
        );
      });

  // Get status color
  const getStatusColor = (status) => {
    if (!status) return '#6b7280';
    const statusLower = status.toLowerCase();
    if (statusLower === 'completed' || statusLower === 'on time') return '#10b981';
    if (statusLower === 'scheduled' || statusLower === 'upcoming') return '#3b82f6';
    if (statusLower === 'delayed' || statusLower === 'overdue') return '#ef4444';
    return '#6b7280';
  };

  return (
    <div className="document-content">
      <h3>Governance & Cadences ({filteredGovernance.length} of {documents.governanceCadences.length})</h3>
      
      {/* Search Bar */}
      <div style={{marginBottom: '16px'}}>
        <input
          type="text"
          placeholder="Search governance meetings..."
          value={governanceSearch}
          onChange={(e) => setGovernanceSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 16px',
            fontSize: '14px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            backgroundColor: 'white'
          }}
        />
      </div>
      
      {/* Governance List */}
      <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
        {filteredGovernance.map((governance, index) => (
          <div 
            key={index} 
            onClick={() => openGovernanceModal(governance)}
            style={{
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '14px 16px', 
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            <div style={{display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0}}>
              <span style={{fontSize: '20px'}}>📅</span>
              <div style={{minWidth: '200px', maxWidth: '320px', flex: '0 1 320px', wordBreak: 'break-word'}}>
                <div style={{fontWeight: '600', color: '#1f2937', fontSize: '14px'}}>
                  {governance['Forum / Meeting Name'] || governance['Meeting Name'] || governance['Meeting Type'] || 'Untitled Meeting'}
                </div>
                <div style={{color: '#6b7280', fontSize: '12px'}}>
                  {governance['Meeting Type'] || '-'}
                </div>
              </div>
              
              {/* Additional Fields */}
              <div style={{display: 'flex', gap: '16px', flex: '0 1 360px', justifyContent: 'space-around', marginLeft: '24px'}}>
                <div style={{textAlign: 'center', minWidth: '100px'}}>
                  <div style={{fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '2px'}}>Frequency</div>
                  <div style={{fontSize: '12px', color: '#374151', fontWeight: '500'}}>
                    {governance['Frequency'] || '-'}
                  </div>
                </div>
                <div style={{textAlign: 'center', minWidth: '100px'}}>
                  <div style={{fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '2px'}}>Status</div>
                  <div style={{
                    fontSize: '12px', 
                    fontWeight: '600',
                    color: getStatusColor(governance['Status']),
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: `${getStatusColor(governance['Status'])}15`
                  }}>
                    {governance['Status'] || '-'}
                  </div>
                </div>
                {governance['Next Meeting Date'] && (
                  <div style={{textAlign: 'center', minWidth: '100px'}}>
                    <div style={{fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '2px'}}>Next Meeting</div>
                    <div style={{fontSize: '12px', color: '#374151', fontWeight: '500'}}>
                      {governance['Next Meeting Date']}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <span style={{color: '#9ca3af', fontSize: '12px'}}>View →</span>
          </div>
        ))}
      </div>
      
      {/* Governance Detail Modal */}
      {renderGovernanceDetailModal()}
    </div>
  );
}

export default GovernanceCadence;
