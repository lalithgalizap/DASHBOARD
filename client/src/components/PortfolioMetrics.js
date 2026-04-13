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
