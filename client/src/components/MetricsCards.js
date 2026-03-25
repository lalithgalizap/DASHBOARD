import React from 'react';
import './MetricsCards.css';

function MetricsCards({ metrics }) {
  const cards = [
    {
      title: 'CLIENTS',
      value: metrics.total_clients || 0,
      color: '#f59e0b'
    },
    {
      title: 'ON TRACK',
      value: `${metrics.on_track || 0}/${metrics.total_projects || 0}`,
      color: '#10b981'
    },
    {
      title: 'COMPLETED PROJECTS',
      value: metrics.completed_projects || 0,
      color: '#6b7280'
    }
  ];

  return (
    <div className="metrics-cards">
      {cards.map((card, index) => (
        <div key={index} className="metric-card">
          <div className="metric-header">
            <span className="metric-title">{card.title}</span>
          </div>
          <div className="metric-value" style={{ color: card.color }}>
            {card.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export default MetricsCards;
