import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import moment from 'moment';
import './journal.css';
import ReactDOM from "react-dom";

// Calendar Icon SVG
const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="calendar-icon">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const formatAPIDate = (date) => moment(date).format("YYYY-MM-DD");
const formatFriendlyDate = (dateString) =>
  moment(dateString).format("MMM D, YYYY");
const formatDayHeading = (iso) => moment(iso).format("dddd D MMM YYYY");

const groupByDay = (list) =>
  list.reduce((acc, a) => {
    const key = moment(a.date).format("YYYY-MM-DD");
    (acc[key] ||= []).push(a);
    return acc;
  }, {});

const Journal = ({ currentUser }) => {
  const API_BASE =
    process.env.REACT_APP_API_BASE ||
    `${window.location.protocol}//${window.location.hostname}:5050`;
  const [activeView, setActiveView] = useState('day');
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDates, setModalDates] = useState({ start: '', end: '' });


  // inline note editing
  const [editingId, setEditingId] = useState(null);
  const [draftComment, setDraftComment] = useState("");
  const [savingNoteId, setSavingNoteId] = useState(null);

  const [collapsedDays, setCollapsedDays] = useState(new Set());

  // Effect to calculate date range when the activeView button changes
  useEffect(() => {
    if (activeView === 'custom') return;

    const today = moment();
    let start, end;

    switch (activeView) {
      case 'day':
        start = today.clone().startOf('day');
        end = today.clone().endOf('day');
        break;
      case 'month':
        start = today.clone().startOf('month');
        end = today.clone().endOf('month');
        break;
      case 'biweek':
        start = today.clone().startOf('week'); // Starts this Monday
        end = today.clone().startOf('week').add(13, 'days').endOf('day'); // Ends Sunday 2 weeks away
        break;
      case 'week':
      default:
        start = today.clone().startOf('week'); // Monday
        end = today.clone().endOf('week');   // Sunday
        break;
    }

    setDateRange({ start: formatAPIDate(start), end: formatAPIDate(end) });
  }, [activeView]); // Re-run when view changes

  // Track the previous date range
  const [prevDateRange, setPrevDateRange] = useState({ start: null, end: null });

  useEffect(() => {
    if (!dateRange.start || !dateRange.end || !currentUser) {
      setExercises([]);
      setLoading(false);
      return;
    }

    // Check if date range actually changed
    const dateRangeChanged =
      prevDateRange.start !== dateRange.start ||
      prevDateRange.end !== dateRange.end;

    if (dateRangeChanged) {
      setPrevDateRange({ start: dateRange.start, end: dateRange.end });
    }

    let alive = true;
    const ctrl = new AbortController();

    const fetchExercises = async () => {
      setLoading(true);
      setError(null);
      const jwt = localStorage.getItem('jwt');
      try {
        const baseUrl = `${API_BASE}/api/activities/range`;
        const res = await axios.get(baseUrl, {
          headers: {
            Authorization: jwt ? `Bearer ${jwt}` : undefined
          },
          params: {
            user: currentUser,
            start: dateRange.start,
            end: dateRange.end,
          },
        });

        if (!alive) return;

        if (Array.isArray(res.data)) {
          setExercises(res.data);

          // Collapse all days only when date range changes
          if (dateRangeChanged && res.data.length > 0) {
            const days = Object.keys(groupByDay(res.data));
            setCollapsedDays(new Set(days));
          }
        } else {
          setError("Received an unexpected response from the server.");
          setExercises([]);
        }
      } catch (err) {
        if (axios.isCancel(err)) return;
        if (err.response) {
          setError(
            `Error ${err.response.status}: ${err.response.data?.error || "Failed to load activities."}`
          );
        } else if (err.request) {
          setError("No response from the server. Is it running?");
        } else {
          setError(String(err.message || "Failed to load activities."));
        }
        setExercises([]);
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchExercises();
    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [currentUser, dateRange, API_BASE]);


  /* Lock body scroll when modal is open */
  useEffect(() => {
    if (isModalOpen) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => document.body.classList.remove("modal-open");
  }, [isModalOpen]);

  // --- Modal Handlers ---

  const openCustomRangeModal = () => {
    setModalDates({
      start: dateRange.start || formatAPIDate(moment()),
      end: dateRange.end || formatAPIDate(moment())
    });
    setIsModalOpen(true);
  };

  const closeCustomRangeModal = () => {
    setIsModalOpen(false);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) closeCustomRangeModal();
  };

  const handleApplyCustomRange = () => {
    const { start, end } = modalDates;

    if (!start || !end) {
      alert("Please select both a start and end date.");
      return;
    }
    if (moment(start).isAfter(moment(end))) {
      alert("Start date cannot be after end date.");
      return;
    }

    setDateRange({ start, end });
    setActiveView('custom');
    setIsModalOpen(false);
  };

  const renderDateRangeDisplay = () => {
    if (!dateRange.start || !dateRange.end) return "Select a period";
    const startFriendly = formatFriendlyDate(dateRange.start);
    const endFriendly = formatFriendlyDate(dateRange.end);
    return startFriendly === endFriendly
      ? startFriendly
      : `${startFriendly} – ${endFriendly}`;
  };

  // --- Note Editing Handlers ---
  const startEdit = (a) => {
    setEditingId(a.id);
    setDraftComment(a.comments || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftComment("");
  };



  const saveNote = async (activity) => {
    try {
      setSavingNoteId(activity.id);
      const activityId = activity.id ?? activity.activity_id ?? activity._id;
      if (!activityId) {
        alert('This activity has no id to update');
        return;
      }
      const jwt = localStorage.getItem('jwt');
      await axios.patch(
        `${API_BASE}/api/activities/${activityId}`,
        { comments: draftComment },
        { headers: { 
          'Content-Type': 'application/json', 
          'Authorization': jwt ? `Bearer ${jwt}` : undefined 
          } 
        }
      );
      // update exercises with the new comment
      setExercises((prev) =>
        prev.map((x) =>
          (x.id ?? x.activity_id ?? x._id) === activityId
            ? { ...x, comments: draftComment }
            : x
        )
      );
      setEditingId(null);
      setDraftComment('');
    } catch (err) {
      console.error('Save note failed:', err.response?.status, err.response?.data);
      alert('Could not save the note.');
    } finally {
      setSavingNoteId(null);
    }
  };

  const toggleDay = (dayKey) => {
    setCollapsedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dayKey)) {
        newSet.delete(dayKey);
      } else {
        newSet.add(dayKey);
      }
      return newSet;
    });
  };

  const groupedByDay = useMemo(() => groupByDay(exercises), [exercises]);
  const dayKeys = useMemo(
    () => Object.keys(groupedByDay).sort((a, b) => moment(b).diff(moment(a))),
    [groupedByDay]
  );

  const renderEditableNote = (a) => {
    const isEditing = editingId === a.id;

    if (!isEditing) {
      return (
        <div className="note-row">
          {a.comments ? (
            <p className="card-comments">{a.comments}</p>
          ) : (
            <p className="card-comments empty">Add a note</p>
          )}
          <button className="note-btn" onClick={() => startEdit(a)}>
            Edit
          </button>
        </div>
      );
    }

    return (
      <div className="note-edit">
        <textarea
          className="note-textarea"
          rows={3}
          value={draftComment}
          onChange={(e) => setDraftComment(e.target.value)}
        />
        <div className="note-actions">
          <button
            className="modal-btn-cancel"
            onClick={cancelEdit}
            disabled={savingNoteId === a.id}
          >
            Cancel
          </button>
          <button
            className="modal-btn-apply"
            onClick={() => saveNote(a)}
            disabled={savingNoteId === a.id}
          >
            {savingNoteId === a.id ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    );
  };

  const renderActivityFeed = () => {
    if (loading) return <div className="loading-spinner" />;
    if (error) return <p className="error-msg">{error}</p>;
    if (exercises.length === 0)
      return <p className="no-activities-msg">No activities found for this period.</p>;

    return (
      <>
        {/* Collapse/Expand All Controls */}
        <div className="collapse-controls">
          <button
            className="collapse-all-btn"
            onClick={() => setCollapsedDays(new Set(dayKeys))}
          >
            Collapse All
          </button>
          <button
            className="expand-all-btn"
            onClick={() => setCollapsedDays(new Set())}
          >
            Expand All
          </button>
        </div>

        <div className="activity-feed">
          {dayKeys.map((day) => {
            const isCollapsed = collapsedDays.has(day);
            const dayActivities = groupedByDay[day];
            const activityCount = dayActivities.length;

            return (
              <div className="day-group" key={day}>
                <button
                  className="day-heading"
                  onClick={() => toggleDay(day)}
                  aria-expanded={!isCollapsed}
                >
                  <span className="day-heading-text">
                    {formatDayHeading(day)}
                  </span>
                  <span className="day-heading-meta">
                    <span className="activity-count">
                      {activityCount} {activityCount === 1 ? 'activity' : 'activities'}
                    </span>
                    <svg
                      className={`chevron-icon ${isCollapsed ? 'collapsed' : 'expanded'}`}
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="day-activities">
                    {dayActivities.map((a) => (
                      <div
                        key={a.id || `${a.date}-${a.activityType}-${a.duration}`}
                        className="activity-card"
                      >
                        <div className="card-header">
                          <h3 className="card-title">{a.activityType || "Activity"}</h3>
                          <span className="card-date">
                            {a.time || moment(a.datetime).utc().format("HH:mm")}
                          </span>
                        </div>
                        <div className="card-body">
                          <p className="card-duration">
                            {a.duration != null ? `${a.duration} minutes` : "No duration"}
                          </p>
                          {renderEditableNote(a)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const modal = (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 className="modal-title">Select Custom Date Range</h3>
        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="start-date">Start date</label>
            <input
              type="date"
              id="start-date"
              className="date-picker-input"
              value={modalDates.start}
              onChange={(e) =>
                setModalDates((prev) => ({ ...prev, start: e.target.value }))
              }
            />
          </div>

          <div className="form-group">
            <label htmlFor="end-date">End date</label>
            <input
              type="date"
              id="end-date"
              className="date-picker-input"
              value={modalDates.end}
              onChange={(e) =>
                setModalDates((prev) => ({ ...prev, end: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-btn-cancel" onClick={closeCustomRangeModal}>
            Cancel
          </button>
          <button className="modal-btn-apply" onClick={handleApplyCustomRange}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
  return (
    <div className="journal-container">
      <h4 className="journal-title">Journal</h4>

      {/* Filter Controls */}
      <div className="filter-controls">
        <div className="filter-toggles">
          <button
            onClick={() => setActiveView('day')}
            className={`filter-btn ${activeView === 'day' ? 'active' : ''}`}>
            Day
          </button>
          <button
            onClick={() => setActiveView('week')}
            className={`filter-btn ${activeView === 'week' ? 'active' : ''}`}>
            This Week
          </button>
          <button
            onClick={() => setActiveView('month')}
            className={`filter-btn ${activeView === 'month' ? 'active' : ''}`}>
            This Month
          </button>
          <button
            onClick={() => setActiveView('biweek')}
            className={`filter-btn ${activeView === 'biweek' ? 'active' : ''}`}>
            Bi-Week
          </button>
        </div>

        <button
          onClick={openCustomRangeModal}
          className={`custom-range-btn ${activeView === 'custom' ? 'active' : ''}`}>
          <CalendarIcon />
          <span>Custom Range</span>
        </button>
      </div>

      {/* Selected Date Range Display */}
      <div className="date-range-display-container">
        <h2 className="date-range-title">Selected Period</h2>
        <p className="date-range-display">
          {dateRange.start && dateRange.end
            ? `${formatFriendlyDate(dateRange.start)} – ${formatFriendlyDate(
              dateRange.end
            )}`
            : "Select a period"}
        </p>
      </div>

      {/* Exercise Sessions List */}
      {renderActivityFeed()}

      {/* Custom Date Range Modal */}
      {isModalOpen && ReactDOM.createPortal(modal, document.body)}
    </div>
  );
};

export default Journal;
