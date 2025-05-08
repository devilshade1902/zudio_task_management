import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import axios from 'axios';
import './Calendar.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

const CalendarView = () => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.warn('No token found, skipping fetchMeetings');
          return;
        }
        const res = await axios.get('http://localhost:5001/meetings/get-meetings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Fetched meetings:', res.data);

        if (!Array.isArray(res.data) || res.data.length === 0) {
          console.warn('No meetings found or invalid data format:', res.data);
          setEvents([]);
          return;
        }

        const formattedEvents = res.data.map((meeting) => {
          const startDateTime = moment(`${meeting.date} ${meeting.time}`, 'YYYY-MM-DD HH:mm').toDate();
          const endDateTime = moment(startDateTime).add(meeting.duration, 'minutes').toDate();

          if (!moment(startDateTime).isValid() || !moment(endDateTime).isValid()) {
            console.warn(`Invalid date/time for meeting ${meeting._id}:`, { date: meeting.date, time: meeting.time });
          }

          return {
            id: meeting._id,
            title: meeting.title,
            start: startDateTime,
            end: endDateTime,
            description: meeting.description,
            link: meeting.link,
          };
        }).filter(event => moment(event.start).isValid() && moment(event.end).isValid());

        console.log('Formatted events:', formattedEvents);
        setEvents(formattedEvents);
      } catch (err) {
        console.error('Error fetching meetings:', {
          message: err.message,
          status: err.response?.status,
          data: err.response?.data,
        });
      }
    };

    fetchMeetings();
  }, []);

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
  };

  const handleCloseModal = () => {
    setSelectedEvent(null);
  };

  return (
    <div className="calendar-container">
      <h2>Calendar</h2>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 600 }}
        onSelectEvent={handleSelectEvent}
        views={['month', 'week', 'day']}
        defaultView="month"
      />
      {selectedEvent && (
        <div className="modal fade show event-modal-overlay" tabIndex="-1" style={{ display: 'block' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content event-modal">
              <div className="modal-header">
                <h3 className="modal-title">{selectedEvent.title}</h3>
                <button type="button" className="btn-close" onClick={handleCloseModal} aria-label="Close"></button>
              </div>
              <div className="modal-body">
                <p><strong>Date:</strong> {moment(selectedEvent.start).format('MMMM Do YYYY')}</p>
                <p><strong>Time:</strong> {moment(selectedEvent.start).format('h:mm A')} - {moment(selectedEvent.end).format('h:mm A')}</p>
                <p><strong>Description:</strong> {selectedEvent.description || 'No description'}</p>
                {selectedEvent.link && (
                  <p><strong>Link:</strong> <a href={selectedEvent.link} target="_blank" rel="noopener noreferrer">Join Meeting</a></p>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-primary modal-close-btn" onClick={handleCloseModal}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;