import React from 'react';
import './PortfolioMetrics.css';

function PortfolioMetrics({ metrics, onMetricClick }) {
  if (!metrics) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleClick = (filterType) => {
    if (onMetricClick) onMetricClick(filterType);
  };

  return (
    <div className="portfolio-metrics">
      <div className="metrics-grid">
        {/* Row 1 */}
        <div className="metric-card metric-card-blue" onClick={() => handleClick('active')} style={{cursor: 'pointer'}}>
          <div className="metric-value metric-large">{metrics.totalActiveProjects}</div>
          <div className="metric-label">Total Active Projects</div>
          <div className="metric-sublabel">Active delivery projects</div>
        </div>

        <div className="metric-card metric-card-green" onClick={() => handleClick('rag')} style={{cursor: 'pointer'}}>
          <div className="metric-value metric-large">
            <span className="rag-green">{metrics.projectsByRAG?.green || 0}</span>
            <span className="rag-divider">/</span>
            <span className="rag-amber">{metrics.projectsByRAG?.amber || 0}</span>
            <span className="rag-divider">/</span>
            <span className="rag-red">{metrics.projectsByRAG?.red || 0}</span>
          </div>
          <div className="metric-label">Projects by RAG Status</div>
          <div className="metric-sublabel">Green / Amber / Red</div>
        </div>

        <div className="metric-card metric-card-default" onClick={() => handleClick('updated')} style={{cursor: 'pointer'}}>
          <div className="metric-value metric-large">{metrics.updatedCount || 0}</div>
          <div className="metric-label">Projects Updated This Week</div>
          <div className="metric-sublabel">Updated in last 7 days</div>
        </div>

        <div className="metric-card metric-card-warning">
          <div className="metric-value metric-large">{metrics.projectsMissingWeeklyUpdate}</div>
          <div className="metric-label">Projects Missing Weekly Update</div>
          <div className="metric-sublabel">Last update older than 7 days</div>
        </div>

        <div className="metric-card metric-card-red">
          <div className="metric-value metric-large">
            {metrics.plannedVsActualProgress >= 0 ? '+' : ''}{metrics.plannedVsActualProgress}%
          </div>
          <div className="metric-label">Planned vs Actual Progress</div>
          <div className="metric-sublabel">Negative variance indicates behind schedule</div>
        </div>

        {/* Row 2 */}
        <div className="metric-card metric-card-default" onClick={() => handleClick('overdue')} style={{cursor: 'pointer'}}>
          <div className="metric-value">{metrics.overdueMilestonesTotal || 0}</div>
          <div className="metric-label">Overdue Milestones (Total)</div>
          <div className="metric-sublabel">Past due and not completed</div>
        </div>

        <div className="metric-card metric-card-default" onClick={() => handleClick('upcoming')} style={{cursor: 'pointer'}}>
          <div className="metric-value">{metrics.upcomingMilestonesTotal || 0}</div>
          <div className="metric-label">Upcoming Milestones (Next 14 Days)</div>
          <div className="metric-sublabel">Due in next 14 days</div>
        </div>

        <div className="metric-card metric-card-red" onClick={() => handleClick('criticalRisks')} style={{cursor: 'pointer'}}>
          <div className="metric-value">{metrics.openCriticalRisksTotal || 0}</div>
          <div className="metric-label">Open Critical Risks</div>
          <div className="metric-sublabel">Critical / High only</div>
        </div>

        <div className="metric-card metric-card-red" onClick={() => handleClick('criticalIssues')} style={{cursor: 'pointer'}}>
          <div className="metric-value">{metrics.openCriticalIssuesTotal || 0}</div>
          <div className="metric-label">Open Critical Issues</div>
          <div className="metric-sublabel">All open issues</div>
        </div>
      </div>
    </div>
  );
}

export default PortfolioMetrics;
