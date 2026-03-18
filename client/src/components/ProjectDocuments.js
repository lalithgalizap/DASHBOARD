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

  useEffect(() => {
    fetchDocuments();
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

  const tabs = [
    { id: 'charter', label: 'Project Charter', icon: FileText },
    { id: 'plan', label: 'Project Plan', icon: Calendar },
    { id: 'milestones', label: 'Milestone Plan', icon: CheckCircle },
    { id: 'raid', label: 'RAID Log', icon: AlertTriangle },
    { id: 'stakeholders', label: 'Stakeholder Register', icon: Users },
    { id: 'cadence', label: 'Cadence Planner', icon: TrendingUp },
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

    return (
      <div className="raid-log-container">
        <div className="raid-header-controls">
            <div className="raid-summary">
            <div className="raid-stat">
              <div className="stat-value">{documents.raidDashboard?.totalRAIDs || 0}</div>
              <div className="stat-label">Total RAIDs</div>
            </div>
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
              {documents.raidLog.map((item, index) => (
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

  const renderContent = () => {
    if (loading) {
      return <div className="loading-state">Loading documents...</div>;
    }

    switch (activeTab) {
      case 'charter':
        return (
          <div className="document-content">
            <h3>Project Charter</h3>
            <p className="placeholder-text">Project charter details will be displayed here based on Excel data.</p>
          </div>
        );
      case 'plan':
        return (
          <div className="document-content">
            <h3>Project Plan</h3>
            <p className="placeholder-text">Project plan details will be displayed here based on Excel data.</p>
          </div>
        );
      case 'milestones':
        return (
          <div className="document-content">
            <h3>Milestone Plan</h3>
            <p className="placeholder-text">Gantt chart and milestone details will be displayed here.</p>
          </div>
        );
      case 'raid':
        return renderRAIDLog();
      case 'stakeholders':
        return (
          <div className="document-content">
            <h3>Stakeholder Register</h3>
            <p className="placeholder-text">Stakeholder information will be displayed here.</p>
          </div>
        );
      case 'cadence':
        return (
          <div className="document-content">
            <h3>Cadence Planner</h3>
            <p className="placeholder-text">Meeting cadence and schedule will be displayed here.</p>
          </div>
        );
      case 'resources':
        return (
          <div className="document-content">
            <h3>Resource Management</h3>
            <p className="placeholder-text">Resource allocation and management details will be displayed here.</p>
          </div>
        );
      case 'closure':
        return (
          <div className="document-content">
            <h3>Project Closure</h3>
            <p className="placeholder-text">Project closure documentation will be displayed here.</p>
          </div>
        );
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
