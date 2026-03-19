import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, AlertTriangle, CheckCircle, Users, Calendar, TrendingUp, Shield, DollarSign, XCircle } from 'lucide-react';
import './ProjectDocuments.css';

function ProjectDocuments({ projectId, projectName }) {
  const [activeTab, setActiveTab] = useState('charter');
  const [documents, setDocuments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [raidViewMode, setRaidViewMode] = useState('table'); // 'table' or 'visualization'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedMitigation, setSelectedMitigation] = useState(null);
  const [showMitigationModal, setShowMitigationModal] = useState(false);
  const [showCharterDetails, setShowCharterDetails] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [selectedStakeholder, setSelectedStakeholder] = useState(null);
  const [showStakeholderModal, setShowStakeholderModal] = useState(false);
  const [stakeholderSearch, setStakeholderSearch] = useState('');
  
  // RAID filters state
  const [raidFilters, setRaidFilters] = useState({
    Type: '',
    Category: '',
    Status: '',
    Severity: '',
    'Mitigation Strategy': ''
  });
  
  // Scope editing state
  const [scopeIncluded, setScopeIncluded] = useState('');
  const [scopeExcluded, setScopeExcluded] = useState('');
  const [isEditingScope, setIsEditingScope] = useState(false);
  const [savingScope, setSavingScope] = useState(false);

  // Project Plan filters state
  const [planFilters, setPlanFilters] = useState({
    Phase: '',
    'Task Type': '',
    Owner: '',
    Status: '',
    'RAG Status': ''
  });

  // Resource Availability filters state
  const [resourceFilters, setResourceFilters] = useState({
    'Resource Name': '',
    'Unavailability Type': '',
    'Status': ''
  });

  useEffect(() => {
    fetchDocuments();
    fetchScope();
  }, [projectId, projectName]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await axios.get(`/api/projects/${projectId}/documents?projectName=${encodeURIComponent(projectName)}&t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchScope = async () => {
    try {
      const response = await axios.get(`/api/projects/${projectId}/scope`);
      setScopeIncluded(response.data.scope_included || '');
      setScopeExcluded(response.data.scope_excluded || '');
    } catch (error) {
      console.error('Error fetching scope:', error);
    }
  };

  const saveScope = async () => {
    try {
      setSavingScope(true);
      await axios.put(`/api/projects/${projectId}/scope`, {
        scope_included: scopeIncluded,
        scope_excluded: scopeExcluded
      });
      setIsEditingScope(false);
    } catch (error) {
      console.error('Error saving scope:', error);
      alert('Failed to save scope');
    } finally {
      setSavingScope(false);
    }
  };

  const tabs = [
    { id: 'charter', label: 'Project Charter', icon: FileText },
    { id: 'plan', label: 'Project Plan', icon: Calendar },
    { id: 'raid', label: 'RAID Log', icon: AlertTriangle },
    { id: 'stakeholders', label: 'Stakeholder Register', icon: Users },
    { id: 'cadence', label: 'Risk Register', icon: Shield },
    { id: 'resources', label: 'Resource Management', icon: DollarSign },
    { id: 'closure', label: 'Project Closure', icon: XCircle }
  ];

  const renderRAIDVisualization = () => {
    if (!documents?.raidLog || documents.raidLog.length === 0) {
      return <div className="empty-state">No RAID items found</div>;
    }

    // Calculate statistics for visualization
    const stats = {
      byStatus: {},
      byMitigation: {},
      byCategory: {}
    };

    documents.raidLog.forEach(item => {
      // By Status
      stats.byStatus[item.Status] = (stats.byStatus[item.Status] || 0) + 1;
      // By Mitigation Strategy
      stats.byMitigation[item['Mitigation Strategy']] = (stats.byMitigation[item['Mitigation Strategy']] || 0) + 1;
      // By Category
      stats.byCategory[item.Category] = (stats.byCategory[item.Category] || 0) + 1;
    });

    // Calculate percentages for donut chart
    const totalMitigation = Object.values(stats.byMitigation).reduce((a, b) => a + b, 0);
    const mitigationData = Object.entries(stats.byMitigation)
      .filter(([strategy]) => strategy && strategy.trim() !== '')
      .map(([strategy, count]) => ({
        strategy,
        count,
        percentage: (count / totalMitigation) * 100
      }));

    // Colors for donut chart - exact matches
    const mitigationColors = {
      'Mitigate': '#4ade80',
      'Accept': '#60a5fa',
      'Avoid': '#a78bfa',
      'Transfer': '#f87171',
      'Escalate': '#fb923c',
      'mitigate': '#4ade80',
      'accept': '#60a5fa',
      'avoid': '#a78bfa',
      'transfer': '#f87171',
      'escalate': '#fb923c'
    };

    // Calculate donut segments
    let currentAngle = 0;
    const donutSegments = mitigationData.map(item => {
      const angle = (item.percentage / 100) * 360;
      const color = mitigationColors[item.strategy] || 
                    mitigationColors[item.strategy?.toLowerCase()] || 
                    '#71717a';
      const segment = {
        ...item,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        color: color
      };
      currentAngle += angle;
      return segment;
    });

    // Calculate key metrics for executive summary
    const totalItems = documents.raidLog.length;
    const criticalItems = documents.raidLog.filter(item => 
      item.Severity === 'Critical' || item.Severity === 'High'
    ).length;
    const openItems = documents.raidLog.filter(item => 
      item.Status !== 'Closed' && item.Status !== 'Complete'
    ).length;
    const overdueItems = documents.raidLog.filter(item => 
      item.Status === 'Behind'
    ).length;

    return (
      <div className="raid-visualization-container">
        {/* Executive Summary Cards */}
        <div className="executive-summary">
          <div className="summary-card critical">
            <div className="summary-icon">⚠️</div>
            <div className="summary-content">
              <div className="summary-value">{criticalItems}</div>
              <div className="summary-label">High Priority</div>
              <div className="summary-sublabel">{Math.round((criticalItems/totalItems)*100)}% of total</div>
            </div>
          </div>
          <div className="summary-card open">
            <div className="summary-icon">📋</div>
            <div className="summary-content">
              <div className="summary-value">{openItems}</div>
              <div className="summary-label">Open Items</div>
              <div className="summary-sublabel">{Math.round((openItems/totalItems)*100)}% active</div>
            </div>
          </div>
          <div className="summary-card overdue">
            <div className="summary-icon">🔴</div>
            <div className="summary-content">
              <div className="summary-value">{overdueItems}</div>
              <div className="summary-label">Behind Schedule</div>
              <div className="summary-sublabel">Needs attention</div>
            </div>
          </div>
          <div className="summary-card total">
            <div className="summary-icon">📊</div>
            <div className="summary-content">
              <div className="summary-value">{totalItems}</div>
              <div className="summary-label">Total RAIDs</div>
              <div className="summary-sublabel">Tracked items</div>
            </div>
          </div>
        </div>

        <div className="dashboard-grid">
          {/* Items by Status - Bar Chart */}
          <div className="viz-card">
            <h4>Status Overview</h4>
            <div className="column-chart">
              <div className="chart-area">
                {Object.entries(stats.byStatus).map(([status, count]) => {
                  // Use actual percentage of total items for true proportional height
                  const percentage = Math.round((count / totalItems) * 100);
                  // Scale with 2x multiplier for better visibility
                  const heightPercent = Math.min((count / totalItems) * 200, 100);
                  const statusColors = {
                    'Not Started': '#6b7280',
                    'In-Progress': '#3b82f6',
                    'Behind': '#ef4444',
                    'Closed': '#22c55e',
                    'Complete': '#22c55e'
                  };
                  return (
                    <div key={status} className="column-item">
                      <div className="column-bar-container">
                        <div 
                          className="column-bar"
                          style={{ 
                            height: `${heightPercent}%`,
                            backgroundColor: statusColors[status] || '#71717a',
                            minHeight: count > 0 ? '20px' : '0'
                          }}
                          title={`${status}: ${count} (${percentage}%)`}
                        />
                        <span className="column-value">{count} <span className="column-percentage-inline">({percentage}%)</span></span>
                      </div>
                      <div className="column-label">{status}</div>
                    </div>
                  );
                })}
              </div>
              <div className="chart-axis">
                <span className="axis-label">Status</span>
              </div>
            </div>
          </div>

          {/* Mitigation Mix - Donut Chart */}
          <div className="viz-card">
            <h4>Mitigation Strategy</h4>
            <div className="donut-chart-container">
              <svg viewBox="0 0 200 200" className="donut-chart">
                <text x="100" y="95" textAnchor="middle" className="donut-center-label">Total</text>
                <text x="100" y="115" textAnchor="middle" className="donut-center-value">{totalItems}</text>
                {donutSegments.map((segment, index) => {
                  const radius = 70;
                  const innerRadius = 45;
                  const startAngle = (segment.startAngle - 90) * (Math.PI / 180);
                  const endAngle = (segment.endAngle - 90) * (Math.PI / 180);
                  
                  const x1 = 100 + radius * Math.cos(startAngle);
                  const y1 = 100 + radius * Math.sin(startAngle);
                  const x2 = 100 + radius * Math.cos(endAngle);
                  const y2 = 100 + radius * Math.sin(endAngle);
                  
                  const ix1 = 100 + innerRadius * Math.cos(startAngle);
                  const iy1 = 100 + innerRadius * Math.sin(startAngle);
                  const ix2 = 100 + innerRadius * Math.cos(endAngle);
                  const iy2 = 100 + innerRadius * Math.sin(endAngle);
                  
                  const largeArc = segment.percentage > 50 ? 1 : 0;
                  
                  const pathData = [
                    `M ${x1} ${y1}`,
                    `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
                    `L ${ix2} ${iy2}`,
                    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1}`,
                    'Z'
                  ].join(' ');
                  
                  return (
                    <path
                      key={index}
                      d={pathData}
                      fill={segment.color}
                      stroke="#ffffff"
                      strokeWidth="2"
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setSelectedMitigation(segment.strategy);
                        setShowMitigationModal(true);
                      }}
                    />
                  );
                })}
              </svg>
              <div className="donut-legend">
                {mitigationData.map((item, index) => {
                  const color = mitigationColors[item.strategy] || 
                               mitigationColors[item.strategy?.toLowerCase()] || 
                               '#71717a';
                  return (
                    <div 
                      key={index} 
                      className="legend-item clickable-legend"
                      onClick={() => {
                        setSelectedMitigation(item.strategy);
                        setShowMitigationModal(true);
                      }}
                    >
                      <span 
                        className="legend-color" 
                        style={{ backgroundColor: color }}
                      />
                      <div className="legend-text">
                        <span className="legend-label">{item.strategy}</span>
                        <span className="legend-count">{item.count} ({Math.round(item.percentage)}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Items by Category - Bar Chart */}
          <div className="viz-card full-width">
            <h4>Items by Category</h4>
            <div className="column-chart">
              <div className="chart-area">
                {Object.entries(stats.byCategory).map(([category, count]) => {
                  // Use actual percentage of total items for true proportional height
                  const percentage = Math.round((count / totalItems) * 100);
                  // Scale to chart height with 2x multiplier for better visibility
                  const heightPercent = Math.min((count / totalItems) * 200, 100);
                  const categoryColors = {
                    'Quality': '#3b82f6',
                    'Cost': '#10b981',
                    'Stakeholder': '#8b5cf6',
                    'Security/Compliance': '#ef4444',
                    'Scope': '#f59e0b',
                    'Technical': '#06b6d4',
                    'Process': '#84cc16',
                    'Resource': '#ec4899'
                  };
                  return (
                    <div 
                      key={category} 
                      className="column-item clickable"
                      onClick={() => {
                        setSelectedCategory(category);
                        setShowCategoryModal(true);
                      }}
                    >
                      <div className="column-bar-container">
                        <div 
                          className="column-bar"
                          style={{ 
                            height: `${heightPercent}%`,
                            backgroundColor: categoryColors[category] || '#71717a',
                            minHeight: count > 0 ? '20px' : '0'
                          }}
                          title={`Click to view ${category} items`}
                        />
                        <span className="column-value">{count} <span className="column-percentage-inline">({percentage}%)</span></span>
                      </div>
                      <div className="column-label">{category}</div>
                    </div>
                  );
                })}
              </div>
              <div className="chart-axis">
                <span className="axis-label">Category</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRAIDLog = () => {
    if (!documents?.raidLog || documents.raidLog.length === 0) {
      return <div className="empty-state">No RAID items found</div>;
    }

    // Get unique values for filter dropdowns
    const getUniqueValues = (field) => {
      const values = [...new Set(documents.raidLog.map(item => item[field]).filter(val => {
        return val && String(val).trim() !== '';
      }))];
      return values.sort();
    };

    const filterOptions = {
      Type: getUniqueValues('Type'),
      Category: getUniqueValues('Category'),
      Status: getUniqueValues('Status'),
      Severity: getUniqueValues('Severity'),
      'Mitigation Strategy': getUniqueValues('Mitigation Strategy')
    };

    // Filter RAID items
    const filteredRaidItems = documents.raidLog.filter(item => {
      return Object.entries(raidFilters).every(([field, value]) => {
        if (!value) return true;
        return item[field] === value;
      });
    });

    // Reset filters
    const resetRaidFilters = () => {
      setRaidFilters({
        Type: '',
        Category: '',
        Status: '',
        Severity: '',
        'Mitigation Strategy': ''
      });
    };

    return (
      <div className="raid-log-container">
        <div className="raid-header-controls">
            <div className="raid-summary">
            <div className="raid-stat risk">
              <div className="stat-value">{documents.raidDashboard?.risks || 0}</div>
              <div className="stat-label">Risks</div>
            </div>
            <div className="raid-stat assumption">
              <div className="stat-value">{documents.raidDashboard?.assumptions || 0}</div>
              <div className="stat-label">Assumptions</div>
            </div>
            <div className="raid-stat issue">
              <div className="stat-value">{documents.raidDashboard?.issues || 0}</div>
              <div className="stat-label">Issues</div>
            </div>
            <div className="raid-stat dependency">
              <div className="stat-value">{documents.raidDashboard?.dependencies || 0}</div>
              <div className="stat-label">Dependencies</div>
            </div>
          </div>

          <div className="view-toggle">
            <button 
              className="toggle-btn refresh-btn"
              onClick={() => fetchDocuments()}
              title="Refresh data from Excel"
            >
              🔄 Refresh
            </button>
            <button 
              className={`toggle-btn ${raidViewMode === 'table' ? 'active' : ''}`}
              onClick={() => setRaidViewMode('table')}
            >
              Table View
            </button>
            <button 
              className={`toggle-btn ${raidViewMode === 'visualization' ? 'active' : ''}`}
              onClick={() => setRaidViewMode('visualization')}
            >
              Visualization
            </button>
          </div>
        </div>

        {raidViewMode === 'table' ? (
          <div className="raid-table-container">
            {/* Filters */}
            <div style={{display: 'flex', gap: '12px', marginBottom: '15px', flexWrap: 'wrap', alignItems: 'center'}}>
              <span style={{fontSize: '13px', fontWeight: '600', color: '#374151'}}>Filters:</span>
              
              {Object.entries(filterOptions).map(([field, values]) => (
                values.length > 0 && (
                  <div key={field} style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                    <span style={{fontSize: '12px', fontWeight: '500', color: '#6b7280'}}>{field}:</span>
                    <select
                      value={raidFilters[field]}
                      onChange={(e) => setRaidFilters(prev => ({ ...prev, [field]: e.target.value }))}
                      style={{
                        padding: '6px 10px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        backgroundColor: raidFilters[field] ? '#dbeafe' : 'white',
                        cursor: 'pointer',
                        minWidth: '120px'
                      }}
                    >
                      <option value="">-- Select --</option>
                      {values.map(val => (
                        <option key={val} value={val}>{val}</option>
                      ))}
                    </select>
                  </div>
                )
              ))}
              
              {Object.values(raidFilters).some(v => v !== '') && (
                <button
                  onClick={resetRaidFilters}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Clear All
                </button>
              )}
            </div>

            <div style={{marginBottom: '10px', fontSize: '13px', color: '#6b7280'}}>
              Showing {filteredRaidItems.length} of {documents.raidLog.length} items
            </div>

          <table className="raid-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Title</th>
                <th>Category</th>
                <th>Impact Area</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Severity</th>
                <th>Mitigation</th>
              </tr>
            </thead>
            <tbody>
              {filteredRaidItems.map((item, index) => (
                <tr key={index}>
                  <td>{item['RAID ID']}</td>
                  <td>
                    <span className={`raid-type ${item.Type?.toLowerCase()}`}>
                      {item.Type}
                    </span>
                  </td>
                  <td>{item.Title}</td>
                  <td>{item.Category}</td>
                  <td>{item['Impact Area']}</td>
                  <td>
                    <span className={`status-badge ${item.Status?.toLowerCase().replace(/[^a-z]/g, '')}`}>
                      {item.Status}
                    </span>
                  </td>
                  <td>{item['RAID Owner']}</td>
                  <td>
                    <span className={`severity ${item.Severity?.toLowerCase()}`}>
                      {item.Severity}
                    </span>
                  </td>
                  <td>{item['Mitigation Strategy']}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        ) : (
          renderRAIDVisualization()
        )}
      </div>
    );
  };

  const renderMitigationModal = () => {
    if (!showMitigationModal || !selectedMitigation) return null;

    const filteredItems = documents.raidLog.filter(item => item['Mitigation Strategy'] === selectedMitigation);
    const mitigationColors = {
      'Mitigate': '#4ade80',
      'Accept': '#60a5fa',
      'Avoid': '#a78bfa',
      'Transfer': '#f87171',
      'Escalate': '#fb923c'
    };

    return (
      <div className="category-modal-overlay" onClick={() => setShowMitigationModal(false)}>
        <div className="category-modal" onClick={(e) => e.stopPropagation()}>
          <div className="category-modal-header">
            <h3>
              <span 
                className="category-color-indicator" 
                style={{ backgroundColor: mitigationColors[selectedMitigation] || '#71717a' }}
              />
              {selectedMitigation} Strategy Items ({filteredItems.length})
            </h3>
            <button className="modal-close-btn" onClick={() => setShowMitigationModal(false)}>✕</button>
          </div>
          <div className="category-modal-content">
            {filteredItems.length === 0 ? (
              <p className="no-items">No items found for this mitigation strategy.</p>
            ) : (
              <div className="raid-items-list">
                {filteredItems.map((item, index) => (
                  <div key={index} className="raid-item-card">
                    <div className="raid-item-header">
                      <span className={`raid-type ${item.Type?.toLowerCase()}`}>{item.Type}</span>
                      <span className={`status-badge ${item.Status?.toLowerCase().replace(/\s+/g, '-')}`}>
                        {item.Status}
                      </span>
                    </div>
                    <h4 className="raid-item-title">{item.Title}</h4>
                    <p className="raid-item-description">{item.Description}</p>
                    <div className="raid-item-details">
                      <div className="detail-row">
                        <span className="detail-label">Owner:</span>
                        <span className="detail-value">{item['RAID Owner'] || 'N/A'}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Severity:</span>
                        <span className={`severity ${item.Severity?.toLowerCase()}`}>{item.Severity}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Category:</span>
                        <span className="detail-value">{item.Category || 'N/A'}</span>
                      </div>
                      {item['RAID Response/Plan'] && (
                        <div className="detail-row full-width">
                          <span className="detail-label">Response Plan:</span>
                          <span className="detail-value">{item['RAID Response/Plan']}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCategoryModal = () => {
    if (!showCategoryModal || !selectedCategory) return null;

    const filteredItems = documents.raidLog.filter(item => item.Category === selectedCategory);
    const categoryColors = {
      'Quality': '#3b82f6',
      'Cost': '#10b981',
      'Stakeholder': '#8b5cf6',
      'Security/Compliance': '#ef4444',
      'Scope': '#f59e0b',
      'Technical': '#06b6d4',
      'Process': '#84cc16',
      'Resource': '#ec4899'
    };

    return (
      <div className="category-modal-overlay" onClick={() => setShowCategoryModal(false)}>
        <div className="category-modal" onClick={(e) => e.stopPropagation()}>
          <div className="category-modal-header">
            <h3>
              <span 
                className="category-color-indicator" 
                style={{ backgroundColor: categoryColors[selectedCategory] || '#71717a' }}
              />
              {selectedCategory} Items ({filteredItems.length})
            </h3>
            <button className="modal-close-btn" onClick={() => setShowCategoryModal(false)}>✕</button>
          </div>
          <div className="category-modal-content">
            {filteredItems.length === 0 ? (
              <p className="no-items">No items found in this category.</p>
            ) : (
              <div className="raid-items-list">
                {filteredItems.map((item, index) => (
                  <div key={index} className="raid-item-card">
                    <div className="raid-item-header">
                      <span className={`raid-type ${item.Type?.toLowerCase()}`}>{item.Type}</span>
                      <span className={`status-badge ${item.Status?.toLowerCase().replace(/\s+/g, '-')}`}>
                        {item.Status}
                      </span>
                    </div>
                    <h4 className="raid-item-title">{item.Title}</h4>
                    <p className="raid-item-description">{item.Description}</p>
                    <div className="raid-item-details">
                      <div className="detail-row">
                        <span className="detail-label">Owner:</span>
                        <span className="detail-value">{item['RAID Owner'] || 'N/A'}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Severity:</span>
                        <span className={`severity ${item.Severity?.toLowerCase()}`}>{item.Severity}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Mitigation:</span>
                        <span className="detail-value">{item['Mitigation Strategy'] || 'N/A'}</span>
                      </div>
                      {item['RAID Response/Plan'] && (
                        <div className="detail-row full-width">
                          <span className="detail-label">Response Plan:</span>
                          <span className="detail-value">{item['RAID Response/Plan']}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderProjectCharter = () => {
    if (!documents?.projectCharter || Object.keys(documents.projectCharter).length === 0) {
      return (
        <div className="document-content">
          <h3>Project Charter</h3>
          <p className="placeholder-text">No project charter data available.</p>
        </div>
      );
    }

    const charter = documents.projectCharter;
    const { basicInfo, title } = charter;

    // Format currency
    const formatCurrency = (val) => {
      if (typeof val === 'number') {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
      }
      return val || 'N/A';
    };

    // Format date
    const formatDate = (val) => {
      if (!val) return 'N/A';
      if (typeof val === 'string' && val.includes('-')) {
        const date = new Date(val);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      return val;
    };

    // Parse scope text into array for display
    const parseScopeItems = (text) => {
      if (!text) return [];
      return text.split('\n').filter(item => item.trim());
    };

    return (
      <div className="document-content charter-content">
        {/* Project Title Header - Show Project Name and Client */}
        <div className="charter-header-banner">
          <h1 className="charter-title">
            {basicInfo?.projectName || projectName || 'Project Charter'}
            {basicInfo?.client && (
              <span className="charter-client"> - {basicInfo.client}</span>
            )}
          </h1>
        </div>

        {/* Basic Information Grid - 3 columns matching Excel layout */}
        <div className="charter-basic-info">
          <div className="info-row">
            <div className="info-cell">
              <label>Project Name</label>
              <div className="info-value">{basicInfo?.projectName || 'N/A'}</div>
            </div>
            <div className="info-cell">
              <label>Project Manager</label>
              <div className="info-value">{basicInfo?.projectManager || 'N/A'}</div>
            </div>
            <div className="info-cell">
              <label>Project Sponsor</label>
              <div className="info-value">{basicInfo?.projectSponsor || 'N/A'}</div>
            </div>
          </div>
          
          <div className="info-row">
            <div className="info-cell">
              <label>Client</label>
              <div className="info-value">{basicInfo?.client || 'N/A'}</div>
            </div>
            <div className="info-cell">
              <label>Project Start Date</label>
              <div className="info-value">{formatDate(basicInfo?.projectStartDate)}</div>
            </div>
            <div className="info-cell">
              <label>Forecast End Date</label>
              <div className="info-value">{formatDate(basicInfo?.forecastEndDate)}</div>
            </div>
          </div>
          
          <div className="info-row">
            <div className="info-cell">
              <label>Estimated Duration</label>
              <div className="info-value">{basicInfo?.estimatedDuration ? `${basicInfo.estimatedDuration} days` : 'N/A'}</div>
            </div>
            <div className="info-cell">
              <label>Estimated Budget</label>
              <div className="info-value budget">{formatCurrency(basicInfo?.estimatedBudget)}</div>
            </div>
            <div className="info-cell">
              <label>Project Complexity</label>
              <div className={`info-value complexity ${basicInfo?.projectComplexity?.toLowerCase()}`}>
                {basicInfo?.projectComplexity || 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Scope Definition Section - Always Visible with Edit Button */}
        <div className="charter-section scope-section" style={{marginTop: '20px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
            <h4>Scope Definition</h4>
            {!isEditingScope ? (
              <button 
                className="edit-btn"
                onClick={() => setIsEditingScope(true)}
                style={{padding: '6px 12px', fontSize: '12px'}}
              >
                Edit Scope
              </button>
            ) : (
              <div style={{display: 'flex', gap: '8px'}}>
                <button 
                  className="save-btn"
                  onClick={saveScope}
                  disabled={savingScope}
                  style={{padding: '6px 12px', fontSize: '12px'}}
                >
                  {savingScope ? 'Saving...' : 'Save'}
                </button>
                <button 
                  className="cancel-btn"
                  onClick={() => {
                    setIsEditingScope(false);
                    fetchScope(); // Reset to saved values
                  }}
                  disabled={savingScope}
                  style={{padding: '6px 12px', fontSize: '12px'}}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          
          <div className="scope-grid">
            <div className="scope-column included">
              <h5>In Scope</h5>
              {isEditingScope ? (
                <textarea
                  value={scopeIncluded}
                  onChange={(e) => setScopeIncluded(e.target.value)}
                  placeholder="Enter scope items (one per line)"
                  style={{width: '100%', minHeight: '150px', padding: '10px', fontSize: '14px', borderRadius: '6px', border: '1px solid #ddd'}}
                />
              ) : (
                <ul>
                  {parseScopeItems(scopeIncluded).length > 0 ? (
                    parseScopeItems(scopeIncluded).map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))
                  ) : (
                    <li className="no-data">No scope items defined. Click Edit to add.</li>
                  )}
                </ul>
              )}
            </div>
            <div className="scope-column excluded">
              <h5>Out of Scope</h5>
              {isEditingScope ? (
                <textarea
                  value={scopeExcluded}
                  onChange={(e) => setScopeExcluded(e.target.value)}
                  placeholder="Enter excluded items (one per line)"
                  style={{width: '100%', minHeight: '150px', padding: '10px', fontSize: '14px', borderRadius: '6px', border: '1px solid #ddd'}}
                />
              ) : (
                <ul>
                  {parseScopeItems(scopeExcluded).length > 0 ? (
                    parseScopeItems(scopeExcluded).map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))
                  ) : (
                    <li className="no-data">No exclusions defined. Click Edit to add.</li>
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProjectPlan = () => {
    if (!documents?.projectPlan || documents.projectPlan.length === 0) {
      return (
        <div className="document-content">
          <h3>Project Plan</h3>
          <p className="placeholder-text">No project plan data available.</p>
        </div>
      );
    }

    // Get all unique columns from the data
    const allColumns = documents.projectPlan.reduce((cols, task) => {
      Object.keys(task).forEach(key => {
        if (!cols.includes(key) && key !== '_MilestoneSeq') {
          cols.push(key);
        }
      });
      return cols;
    }, []);

    // Show only these 12 columns initially
    const initialColumns = [
      'Task ID', 'WBS', 'Phase', 'Task Name', 'Task Type', 'Owner', 
      'Status', '% Complete', 'RAG Status', 'Predecessor ID', 
      'Support Team / Function', 'Planned Start Date'
    ].filter(col => allColumns.includes(col));

    // Remaining columns (shown in modal)
    const remainingColumns = allColumns.filter(col => !initialColumns.includes(col));

    // Get unique values for filter dropdowns (exclude the field name itself)
    const getUniqueValues = (field) => {
      const values = [...new Set(documents.projectPlan.map(task => task[field]).filter(val => {
        // Filter out empty values AND the field name itself
        return val && val !== field && String(val).trim() !== '';
      }))];
      return values.sort();
    };

    const filterOptions = {
      Phase: getUniqueValues('Phase'),
      'Task Type': getUniqueValues('Task Type'),
      Owner: getUniqueValues('Owner'),
      Status: getUniqueValues('Status'),
      'RAG Status': getUniqueValues('RAG Status')
    };

    // Filter tasks based on selected filters
    const filteredTasks = documents.projectPlan.filter(task => {
      return Object.entries(planFilters).every(([field, value]) => {
        if (!value) return true; // No filter selected
        return task[field] === value;
      });
    });

    // Reset all filters
    const resetFilters = () => {
      setPlanFilters({
        Phase: '',
        'Task Type': '',
        Owner: '',
        Status: '',
        'RAG Status': ''
      });
    };

    // Format cell value for display
    const formatValue = (value, column) => {
      if (value === '' || value === null || value === undefined) return '-';
      if (column === '% Complete') return `${(value * 100).toFixed(0)}%`;
      if (typeof value === 'number' && value > 40000 && value < 50000) {
        const date = new Date((value - 25569) * 86400 * 1000);
        return date.toLocaleDateString();
      }
      return value;
    };

    // Get CSS class for cell based on column
    const getCellClass = (column, value) => {
      if (column === 'Status') return `status-badge ${value?.toLowerCase().replace(/\s+/g, '-')}`;
      if (column === 'RAG Status') return `rag-indicator ${value?.toLowerCase()}`;
      return '';
    };

    // Open task detail modal
    const openTaskModal = (task) => {
      setSelectedTask(task);
      setShowTaskModal(true);
    };

    // Render task detail modal
    const renderTaskModal = () => {
      if (!showTaskModal || !selectedTask) return null;

      return (
        <div className="category-modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="category-modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '800px', maxHeight: '80vh', overflow: 'auto'}}>
            <div className="category-modal-header">
              <h3>
                <span className="category-color-indicator" style={{ backgroundColor: '#3b82f6' }} />
                Task Details: {selectedTask['Task Name'] || selectedTask['Task ID']}
              </h3>
              <button className="modal-close-btn" onClick={() => setShowTaskModal(false)}>✕</button>
            </div>
            <div className="category-modal-content">
              <div className="task-detail-tile" style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', padding: '16px'}}>
                {allColumns.map((col, idx) => {
                  const value = selectedTask[col];
                  const cellClass = getCellClass(col, value);
                  return (
                    <div key={idx} className="detail-item" style={{
                      display: 'flex', 
                      flexDirection: 'column', 
                      padding: '12px', 
                      backgroundColor: '#f8f9fa', 
                      borderRadius: '8px',
                      border: '1px solid #e9ecef'
                    }}>
                      <label style={{fontSize: '11px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px'}}>{col}</label>
                      <span style={{fontSize: '14px', fontWeight: '500'}}>
                        {cellClass ? (
                          <span className={cellClass}>{formatValue(value, col)}</span>
                        ) : (
                          formatValue(value, col)
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="document-content">
        
        {/* Task Statistics Cards */}
        <div className="plan-stats" style={{display: 'flex', gap: '16px', marginBottom: '20px'}}>
          <div style={{flex: 1, backgroundColor: 'white', border: '1px solid #e5e7eb', padding: '16px 20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)'}}>
            <div style={{fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px'}}>Total Tasks</div>
            <div style={{fontSize: '28px', fontWeight: '600', color: '#1f2937'}}>{documents.projectPlan.length}</div>
          </div>
          <div style={{flex: 1, backgroundColor: 'white', border: '1px solid #e5e7eb', padding: '16px 20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)'}}>
            <div style={{fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px'}}>Completed</div>
            <div style={{fontSize: '28px', fontWeight: '600', color: '#16a34a'}}>{documents.projectPlan.filter(t => t.Status === 'Completed').length}</div>
          </div>
          <div style={{flex: 1, backgroundColor: 'white', border: '1px solid #e5e7eb', padding: '16px 20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)'}}>
            <div style={{fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px'}}>In Progress</div>
            <div style={{fontSize: '28px', fontWeight: '600', color: '#2563eb'}}>{documents.projectPlan.filter(t => t.Status?.toLowerCase().replace(/\s+/g, '-') === 'in-progress' || t.Status?.toLowerCase() === 'in progress').length}</div>
          </div>
          <div style={{flex: 1, backgroundColor: 'white', border: '1px solid #e5e7eb', padding: '16px 20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)'}}>
            <div style={{fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px'}}>RAG Red</div>
            <div style={{fontSize: '28px', fontWeight: '600', color: '#dc2626'}}>{documents.projectPlan.filter(t => t['RAG Status'] === 'Red').length}</div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="plan-filters" style={{display: 'flex', gap: '12px', marginBottom: '15px', flexWrap: 'wrap', alignItems: 'center'}}>
          <span style={{fontSize: '13px', fontWeight: '600', color: '#374151'}}>Filters:</span>
          
          {Object.entries(filterOptions).map(([field, values]) => (
            values.length > 0 && (
              <div key={field} style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                <span style={{fontSize: '12px', fontWeight: '500', color: '#6b7280'}}>{field}:</span>
                <select
                  value={planFilters[field]}
                  onChange={(e) => setPlanFilters(prev => ({ ...prev, [field]: e.target.value }))}
                  style={{
                    padding: '6px 10px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    backgroundColor: planFilters[field] ? '#dbeafe' : 'white',
                    cursor: 'pointer',
                    minWidth: '120px'
                  }}
                >
                  <option value="">-- Select --</option>
                  {values.map(val => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                </select>
              </div>
            )
          ))}
          
          {Object.values(planFilters).some(v => v !== '') && (
            <button
              onClick={resetFilters}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Clear All
            </button>
          )}
        </div>

        <div className="plan-table-container" style={{overflowX: 'auto', maxHeight: '600px'}}>
          <table className="plan-table" style={{minWidth: '100%', fontSize: '12px'}}>
            <thead style={{position: 'sticky', top: 0, zIndex: 1}}>
              <tr>
                <th style={{whiteSpace: 'nowrap', padding: '8px', width: '30px'}}>+</th>
                {initialColumns.map((col, idx) => (
                  <th key={idx} style={{whiteSpace: 'nowrap', padding: '8px'}}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task, index) => (
                <tr key={index} onClick={() => openTaskModal(task)} style={{cursor: 'pointer'}}>
                  <td style={{padding: '6px 8px', textAlign: 'center'}}>
                    ▶
                  </td>
                  {initialColumns.map((col, colIdx) => {
                    const value = task[col];
                    const cellClass = getCellClass(col, value);
                    return (
                      <td key={colIdx} style={{padding: '6px 8px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                        {cellClass ? (
                          <span className={cellClass}>{formatValue(value, col)}</span>
                        ) : (
                          formatValue(value, col)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Task Detail Modal */}
        {renderTaskModal()}
      </div>
    );
  };

  const renderMilestones = () => {
    if (!documents?.milestoneTracker || documents.milestoneTracker.length === 0) {
      return (
        <div className="document-content">
          <h3>Milestone Plan</h3>
          <p className="placeholder-text">No milestone data available.</p>
        </div>
      );
    }

    return (
      <div className="document-content">
        <h3>Milestone Tracker ({documents.milestoneTracker.length} milestones)</h3>
        <div className="milestones-list">
          {documents.milestoneTracker.map((milestone, index) => (
            <div key={index} className={`milestone-card ${milestone['Status']?.toLowerCase().replace(/\s+/g, '-')}`}>
              <div className="milestone-header">
                <span className="milestone-ref">{milestone['Milestone Ref']}</span>
                <span className="milestone-wbs">WBS: {milestone['WBS']}</span>
                <span className={`milestone-status ${milestone['Status']?.toLowerCase().replace(/\s+/g, '-')}`}>
                  {milestone['Status']}
                </span>
              </div>
              <div className="milestone-name">{milestone['Milestone / Task Name']}</div>
              <div className="milestone-details">
                <div className="milestone-detail">
                  <label>Owner:</label>
                  <span>{milestone['Owner']}</span>
                </div>
                <div className="milestone-detail">
                  <label>Planned End:</label>
                  <span>{milestone['Planned End Date']}</span>
                </div>
                <div className="milestone-detail">
                  <label>Completion:</label>
                  <span>{(milestone['% Complete'] * 100).toFixed(0)}%</span>
                </div>
                {milestone['Variance (Days)'] !== 0 && (
                  <div className="milestone-detail variance">
                    <label>Variance:</label>
                    <span className={milestone['Variance (Days)'] > 0 ? 'behind' : 'ahead'}>
                      {milestone['Variance (Days)']} days
                    </span>
                  </div>
                )}
              </div>
              {milestone['Notes'] && (
                <div className="milestone-notes">
                  <label>Notes:</label>
                  <p>{milestone['Notes']}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderStakeholders = () => {
    if (!documents?.stakeholderRegister || documents.stakeholderRegister.length === 0) {
      return (
        <div className="document-content">
          <h3>Stakeholder Register</h3>
          <p className="placeholder-text">No stakeholder data available.</p>
        </div>
      );
    }

    // Get all columns from stakeholder data
    const allColumns = documents.stakeholderRegister.reduce((cols, s) => {
      Object.keys(s).forEach(key => {
        if (!cols.includes(key)) cols.push(key);
      });
      return cols;
    }, []);

    // Open stakeholder detail modal
    const openStakeholderModal = (stakeholder) => {
      setSelectedStakeholder(stakeholder);
      setShowStakeholderModal(true);
    };

    // Render stakeholder detail modal
    const renderStakeholderDetailModal = () => {
      if (!showStakeholderModal || !selectedStakeholder) return null;

      return (
        <div className="category-modal-overlay" onClick={() => setShowStakeholderModal(false)}>
          <div className="category-modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '700px', maxHeight: '80vh', overflow: 'auto'}}>
            <div className="category-modal-header">
              <h3>
                <span className="category-color-indicator" style={{ backgroundColor: '#8b5cf6' }} />
                Stakeholder Details: {selectedStakeholder['Name']}
              </h3>
              <button className="modal-close-btn" onClick={() => setShowStakeholderModal(false)}>✕</button>
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
                    <span style={{fontSize: '14px', fontWeight: '500'}}>{selectedStakeholder[col] || '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    };

    // Filter stakeholders based on search
    const filteredStakeholders = stakeholderSearch.trim() === '' 
      ? documents.stakeholderRegister 
      : documents.stakeholderRegister.filter(s => {
          const searchTerm = stakeholderSearch.toLowerCase();
          return (
            String(s['Name'] || '').toLowerCase().includes(searchTerm) ||
            String(s['Designation / Role'] || '').toLowerCase().includes(searchTerm) ||
            String(s['Role'] || '').toLowerCase().includes(searchTerm)
          );
        });

    return (
      <div className="document-content">
        <h3>Stakeholder Register ({filteredStakeholders.length} of {documents.stakeholderRegister.length})</h3>
        
        {/* Search Bar */}
        <div style={{marginBottom: '16px'}}>
          <input
            type="text"
            placeholder="Search stakeholders..."
            value={stakeholderSearch}
            onChange={(e) => setStakeholderSearch(e.target.value)}
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
        
        {/* Stakeholder List */}
        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
          {filteredStakeholders.map((stakeholder, index) => (
            <div 
              key={index} 
              onClick={() => openStakeholderModal(stakeholder)}
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
              <div style={{display: 'flex', alignItems: 'center', gap: '16px', flex: 1}}>
                <span style={{fontSize: '20px'}}>👤</span>
                <div style={{minWidth: '180px'}}>
                  <div style={{fontWeight: '600', color: '#1f2937', fontSize: '14px'}}>{stakeholder['Name']}</div>
                  <div style={{color: '#6b7280', fontSize: '12px'}}>{stakeholder['Designation / Role']}</div>
                </div>
                
                {/* Additional Fields */}
                <div style={{display: 'flex', gap: '16px', flex: 1, justifyContent: 'center'}}>
                  <div style={{textAlign: 'center', minWidth: '80px'}}>
                    <div style={{fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '2px'}}>Role</div>
                    <div style={{fontSize: '12px', color: '#374151', fontWeight: '500'}}>{stakeholder['Role'] || '-'}</div>
                  </div>
                </div>
              </div>
              <span style={{color: '#9ca3af', fontSize: '12px'}}>View →</span>
            </div>
          ))}
        </div>
        
        {/* Stakeholder Detail Modal */}
        {renderStakeholderDetailModal()}
      </div>
    );
  };

  const renderRiskRegister = () => {
    if (!documents?.riskRegister || documents.riskRegister.length === 0) {
      return (
        <div className="document-content">
          <h3>Risk Register</h3>
          <p className="placeholder-text">No risk register data available.</p>
        </div>
      );
    }

    // Get all unique columns from the data (filter out __EMPTY columns)
    const allColumns = documents.riskRegister.reduce((cols, risk) => {
      Object.keys(risk).forEach(key => {
        if (!cols.includes(key) && !key.startsWith('__EMPTY')) {
          cols.push(key);
        }
      });
      return cols;
    }, []);

    // Initial columns to show (priority fields) - using actual Excel column names
    const priorityCols = ['ID', 'Risk Description', 'Impact Area', 'Impact Rating', 'Probability', 'Risk Priority', 'Status', 'Risk Owner', 'Mitigation Strategy'];
    const initialColumns = priorityCols.filter(col => allColumns.includes(col));
    
    // If no priority columns found, use first 8 columns
    const displayColumns = initialColumns.length > 0 ? initialColumns : allColumns.slice(0, 8);
    
    // Remaining columns (shown in modal)
    const remainingColumns = allColumns.filter(col => !displayColumns.includes(col));

    // Format cell value for display
    const formatValue = (value, column) => {
      if (value === '' || value === null || value === undefined) return '-';
      return value;
    };

    // Get CSS class for cell based on column
    const getCellClass = (column, value) => {
      if (column === 'Status') return `status-badge ${value?.toLowerCase().replace(/\s+/g, '-')}`;
      if (column === 'Risk Priority' || column === 'Impact Rating' || column === 'Probability') return `risk-badge ${value?.toLowerCase()}`;
      return '';
    };

    // Open risk detail modal
    const openRiskModal = (risk) => {
      setSelectedRisk(risk);
      setShowRiskModal(true);
    };

    // Render risk detail modal
    const renderRiskModal = () => {
      if (!showRiskModal || !selectedRisk) return null;

      return (
        <div className="category-modal-overlay" onClick={() => setShowRiskModal(false)}>
          <div className="category-modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '900px', maxHeight: '80vh', overflow: 'auto'}}>
            <div className="category-modal-header">
              <h3>
                <span className="category-color-indicator" style={{ backgroundColor: '#ef4444' }} />
                Risk Details: {selectedRisk['Risk Description']?.substring(0, 50) || selectedRisk['ID']}...
              </h3>
              <button className="modal-close-btn" onClick={() => setShowRiskModal(false)}>✕</button>
            </div>
            <div className="category-modal-content">
              <div className="risk-detail-tile" style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', padding: '16px'}}>
                {allColumns.map((col, idx) => {
                  const value = selectedRisk[col];
                  const cellClass = getCellClass(col, value);
                  return (
                    <div key={idx} className="detail-item" style={{
                      display: 'flex', 
                      flexDirection: 'column', 
                      padding: '12px', 
                      backgroundColor: '#f8f9fa', 
                      borderRadius: '8px',
                      border: '1px solid #e9ecef'
                    }}>
                      <label style={{fontSize: '11px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px'}}>{col}</label>
                      <span style={{fontSize: '14px', fontWeight: '500'}}>
                        {cellClass ? (
                          <span className={cellClass}>{formatValue(value, col)}</span>
                        ) : (
                          formatValue(value, col)
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="document-content">
        <h3>Risk Register ({documents.riskRegister.length} risks)</h3>
        <div className="plan-table-container" style={{overflowX: 'auto', maxHeight: '600px'}}>
          <table className="plan-table" style={{minWidth: '100%', fontSize: '12px'}}>
            <thead style={{position: 'sticky', top: 0, zIndex: 1}}>
              <tr>
                <th style={{whiteSpace: 'nowrap', padding: '8px', width: '30px'}}>+</th>
                {displayColumns.map((col, idx) => (
                  <th key={idx} style={{whiteSpace: 'nowrap', padding: '8px'}}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {documents.riskRegister.map((risk, index) => (
                <tr key={index} onClick={() => openRiskModal(risk)} style={{cursor: 'pointer'}}>
                  <td style={{padding: '6px 8px', textAlign: 'center'}}>
                    ▶
                  </td>
                  {displayColumns.map((col, colIdx) => {
                    const value = risk[col];
                    const cellClass = getCellClass(col, value);
                    return (
                      <td key={colIdx} style={{padding: '6px 8px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                        {cellClass ? (
                          <span className={cellClass}>{formatValue(value, col)}</span>
                        ) : (
                          formatValue(value, col)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Risk Detail Modal */}
        {renderRiskModal()}
      </div>
    );
  };

  const renderResources = () => {
    // Show resource availability data if available
    const hasAvailability = documents?.resourceAvailability && documents.resourceAvailability.length > 0;
    
    if (!hasAvailability) {
      return (
        <div className="document-content">
          <h3>Resource Availability</h3>
          <p className="placeholder-text">No resource availability data available.</p>
        </div>
      );
    }

    // Get all columns from the data
    const allColumns = documents.resourceAvailability.reduce((cols, record) => {
      Object.keys(record).forEach(key => {
        if (!cols.includes(key)) {
          cols.push(key);
        }
      });
      return cols;
    }, []);

    // Priority columns to show first
    const priorityColumns = [
      'Resource Name', 'Zapcom ID', 'Role', 'Workstream / Function', 
      'Allocation %', 'Start Date', 'End Date', 'Status', 
      'Criticality', 'Primary Manager / Lead', 'Backup / Secondary Owner', 'Notes'
    ].filter(col => allColumns.includes(col));

    // Remaining columns
    const remainingColumns = allColumns.filter(col => !priorityColumns.includes(col));

    // Columns to display in table
    const displayColumns = [...priorityColumns, ...remainingColumns];

    // Get unique values for filter dropdowns
    const getUniqueValues = (field) => {
      const values = [...new Set(documents.resourceAvailability.map(record => record[field]).filter(val => {
        return val && String(val).trim() !== '';
      }))];
      return values.sort();
    };

    const filterOptions = {
      'Resource Name': getUniqueValues('Resource Name'),
      'Unavailability Type': getUniqueValues('Unavailability Type'),
      'Status': getUniqueValues('Status')
    };

    // Filter records based on selected filters
    const filteredRecords = documents.resourceAvailability.filter(record => {
      return Object.entries(resourceFilters).every(([field, value]) => {
        if (!value) return true;
        return record[field] === value;
      });
    });

    // Reset filters
    const resetResourceFilters = () => {
      setResourceFilters({
        'Resource Name': '',
        'Unavailability Type': '',
        'Status': ''
      });
    };

    // Format cell value
    const formatValue = (value, column) => {
      if (value === '' || value === null || value === undefined) return '-';
      if (typeof value === 'number' && column.includes('%')) return `${(value * 100).toFixed(0)}%`;
      return value;
    };

    return (
      <div className="document-content">
        <h3>Resource Availability</h3>
        
        {/* Statistics */}
        <div className="plan-stats" style={{display: 'flex', gap: '16px', marginBottom: '20px'}}>
          <div style={{flex: 1, backgroundColor: 'white', border: '1px solid #e5e7eb', padding: '16px 20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)'}}>
            <div style={{fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px'}}>Total Resources</div>
            <div style={{fontSize: '28px', fontWeight: '600', color: '#1f2937'}}>{documents.resourceAvailability.length}</div>
          </div>
          <div style={{flex: 1, backgroundColor: 'white', border: '1px solid #e5e7eb', padding: '16px 20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)'}}>
            <div style={{fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px'}}>Showing</div>
            <div style={{fontSize: '28px', fontWeight: '600', color: '#2563eb'}}>{filteredRecords.length}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="plan-filters" style={{display: 'flex', gap: '12px', marginBottom: '15px', flexWrap: 'wrap', alignItems: 'center'}}>
          <span style={{fontSize: '13px', fontWeight: '600', color: '#374151'}}>Filters:</span>
          
          {Object.entries(filterOptions).map(([field, values]) => (
            values.length > 0 && (
              <div key={field} style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                <span style={{fontSize: '12px', fontWeight: '500', color: '#6b7280'}}>{field}:</span>
                <select
                  value={resourceFilters[field]}
                  onChange={(e) => setResourceFilters(prev => ({ ...prev, [field]: e.target.value }))}
                  style={{
                    padding: '6px 10px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    backgroundColor: resourceFilters[field] ? '#dbeafe' : 'white',
                    cursor: 'pointer',
                    minWidth: '120px'
                  }}
                >
                  <option value="">-- Select --</option>
                  {values.map(val => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                </select>
              </div>
            )
          ))}
          
          {Object.values(resourceFilters).some(v => v !== '') && (
            <button
              onClick={resetResourceFilters}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Clear All
            </button>
          )}
        </div>

        {/* Table */}
        <div className="plan-table-container" style={{overflowX: 'auto', maxHeight: '600px'}}>
          <table className="plan-table" style={{minWidth: '100%', fontSize: '12px'}}>
            <thead style={{position: 'sticky', top: 0, zIndex: 1}}>
              <tr>
                {displayColumns.map((col, idx) => (
                  <th key={idx} style={{whiteSpace: 'nowrap', padding: '8px'}}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record, index) => (
                <tr key={index}>
                  {displayColumns.map((col, colIdx) => {
                    const value = record[col];
                    return (
                      <td key={colIdx} style={{padding: '6px 8px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                        {formatValue(value, col)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderClosure = () => {
    return (
      <div className="document-content">
        <h3>Project Closure</h3>
        <p className="placeholder-text">Project closure documentation will be available upon project completion.</p>
        <div className="closure-checklist">
          <h4>Closure Checklist</h4>
          <ul>
            <li>☐ All deliverables completed and approved</li>
            <li>☐ Lessons learned documented</li>
            <li>☐ Final budget reconciliation</li>
            <li>☐ Team performance review</li>
            <li>☐ Knowledge transfer completed</li>
            <li>☐ Stakeholder sign-off obtained</li>
          </ul>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return <div className="loading-state">Loading documents...</div>;
    }

    switch (activeTab) {
      case 'charter':
        return renderProjectCharter();
      case 'plan':
        return renderProjectPlan();
      case 'milestones':
        return renderMilestones();
      case 'raid':
        return renderRAIDLog();
      case 'stakeholders':
        return renderStakeholders();
      case 'cadence':
        return renderRiskRegister();
      case 'resources':
        return renderResources();
      case 'closure':
        return renderClosure();
      default:
        return null;
    }
  };

  return (
    <div className="project-documents">
      <div className="documents-tabs">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`doc-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
      <div className="documents-content">
        {renderContent()}
      </div>
      {/* Category Modal */}
      {showCategoryModal && selectedCategory && renderCategoryModal()}
      {/* Mitigation Modal */}
      {showMitigationModal && selectedMitigation && renderMitigationModal()}
    </div>
  );
}

export default ProjectDocuments;
