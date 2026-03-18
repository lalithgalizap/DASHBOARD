import React from 'react';
import { ChevronRight } from 'lucide-react';
import './UpcomingEvents.css';

function UpcomingEvents({ events }) {
  return (
    <div className="upcoming-events">
      <div className="events-header">
        <h3>UPCOMING EVENTS</h3>
        <button className="expand-btn">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="events-list">
        {events.length === 0 ? (
          <div className="empty-events">
            <p>No upcoming events</p>
          </div>
        ) : (
          events.slice(0, 3).map((event, index) => (
            <div key={index} className="event-item">
              <div className="event-content">
                <span className="event-title">{event.title}</span>
                <span className="event-date">{event.date}</span>
              </div>
              <span className="event-tag">{event.tag}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default UpcomingEvents;
