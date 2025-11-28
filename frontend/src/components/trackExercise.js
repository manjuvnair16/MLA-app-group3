import React, { useState, useEffect, useRef } from 'react';
import { Button, Form, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { trackExercise, getCustomActivities, createCustomActivity, deleteCustomActivity } from '../api.js';
import 'bootstrap/dist/css/bootstrap.min.css';
import { IconButton } from '@mui/material';
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import TimerIcon from '@mui/icons-material/Timer';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { enGB } from 'date-fns/locale';
import CustomActivityModal from './CustomActivityModal.js';
import './dropdown-activity-selector.css';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';



const TrackExercise = ({ currentUser }) => {
  const [state, setState] = useState({
    exerciseType: '',
    description: '',
    duration: 0,
    date: new Date(),
  });
  const [message, setMessage] = useState('');
  const [customActivities, setCustomActivities] = useState([]);
  const [showCustomActivityModal, setShowCustomActivityModal] = useState(false);

  // Speech to Text
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);

  // Fetch custom activities on component mount
  useEffect(() => {
    fetchCustomActivities();
  }, [currentUser]);

  const fetchCustomActivities = async () => {
    try {
      const response = await getCustomActivities(currentUser);
      setCustomActivities(response.data);
    } catch (error) {
      console.error('Error fetching custom activities:', error);
      setCustomActivities([]);  // Set to empty array on error
    }
  };

  const handleActivityCreated = (newActivity) => {
    setCustomActivities(prev => [...prev, newActivity]);
    setState(prev => ({ ...prev, exerciseType: newActivity.activityName }));
    setMessage(`✅ Custom activity "${newActivity.activityName}" created successfully!`);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSpeechParse = async (transcript) => {
    try {
      const response = await fetch("http://localhost:5051/speech_to_text_parser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transcript }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      const parsed = data.parsed;
      console.log("Parsed activity:", parsed);

      if (parsed) {
        // Validate that we have the essential data
        if (!parsed.exerciseType || !parsed.duration || !parsed.date || !parsed.description) {
          alert("❗ That doesn't look like a valid fitness activity or it is missing some details (activity type, duration, date, description). Please try again.");
          return;
        }

        /* ====================================================================
           AUTO-CREATE CUSTOM ACTIVITY IF IT DOESN'T EXIST
           ==================================================================== */

        // Get all available activities (default + custom)
        const allDefaultActivities = [];
        activityCategories.forEach(category => {
          category.activities.forEach(activity => {
            allDefaultActivities.push(activity.value);
          });
        });

        const customActivityNames = customActivities.map(ca => ca.activityName);
        const allActivities = [...allDefaultActivities, ...customActivityNames];

        // Check if activity exists (case-insensitive)
        const activityExists = allActivities.some(
          activity => activity.toLowerCase() === parsed.exerciseType.toLowerCase()
        );

        // If activity doesn't exist and it's not "Unknown", auto-create it
        if (!activityExists && parsed.exerciseType !== 'Unknown') {
          try {
            console.log(`Auto-creating custom activity: ${parsed.exerciseType}`);
            setMessage(`Creating custom activity: ${parsed.exerciseType}...`);

            // Create the custom activity
            await createCustomActivity({
              username: currentUser,
              activityName: parsed.exerciseType
            });

            console.log(`Successfully created: ${parsed.exerciseType}`);

            // Refresh the custom activities list
            await fetchCustomActivities();

            // Small delay to ensure state updates
            await new Promise(resolve => setTimeout(resolve, 200));

            setMessage(`✅ Created "${parsed.exerciseType}" and populated form!`);

          } catch (error) {
            console.error('Error auto-creating activity:', error);

            // Check if it's a duplicate error (activity was just created)
            if (error.response?.data?.error?.includes('already exists')) {
              console.log('Activity already exists, continuing...');
              await fetchCustomActivities(); // Refresh list anyway
              setMessage(`✅ Activity "${parsed.exerciseType}" found!`);
            } else if (error.response?.data?.error?.includes('maximum')) {
              setMessage(`⚠️ Maximum custom activities (10) reached. Please delete one first.`);
              return; // Don't populate form
            } else {
              setMessage(`⚠️ Could not create "${parsed.exerciseType}". Add it manually.`);
              return; // Don't populate form if creation failed
            }
          }
        }

        /* ====================================================================
            POPULATE FORM WITH PARSED DATA
           ==================================================================== */

        // Parse date
        let parsedDate = null;
        if (parsed.date) {
          const parts = parsed.date.split('/');
          const year = parseInt(parts[0]);
          const monthIndex = parseInt(parts[1]) - 1;
          const day = parseInt(parts[2]);
          const hour = 3;
          const minute = 0;
          const second = 0;
          parsedDate = new Date(year, monthIndex, day, hour, minute, second);
        } else {
          parsedDate = new Date();
        }

        // Set form state
        setState(prev => ({
          ...prev,
          exerciseType: parsed.exerciseType || prev.exerciseType,
          duration: parsed.duration || prev.duration,
          description: parsed.description || prev.description,
          date: parsedDate || prev.date,
        }));

        // Show success message if activity already existed
        if (activityExists) {
          setMessage(`✅ Parsed from speech: ${parsed.exerciseType}`);
        }

      } else {
        alert("❗ Could not parse activity. Please try again.");
      }
    } catch (err) {
      console.error("Parsing failed:", err);
      setMessage('❌ Speech parsing failed. Please try again.');
    }
  };

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Sorry, your browser does not support Speech Recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-GB";

    recognition.onresult = (event) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          setTranscript((prev) => prev + text + " ");
        } else {
          interimTranscript += text;
        }
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

  }, []);

  const toggleListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (listening) {
      recognition.stop();
      setListening(false);
      if (transcript.trim().length !== 0) {
        handleSpeechParse(transcript);
      }
    } else {
      setTranscript("");
      recognition.start();
      setListening(true);
    }
  };


  // Timer state
  const [timerMode, setTimerMode] = useState('manual');
  const [timerState, setTimerState] = useState('stopped');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [displayTime, setDisplayTime] = useState('00:00:00');
  const intervalRef = useRef(null);

  // Timer functions
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = () => {
    setTimerState('running');
    intervalRef.current = setInterval(() => {
      setTimerSeconds(prev => {
        const newSeconds = prev + 1;
        setDisplayTime(formatTime(newSeconds));
        return newSeconds;
      });
    }, 1000);
  };

  const pauseTimer = () => {
    setTimerState('paused');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const stopTimer = () => {
    setTimerState('stopped');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    const durationInMinutes = Math.round(timerSeconds / 60);
    setState(prev => ({ ...prev, duration: durationInMinutes }));
  };

  const resetTimer = () => {
    setTimerSeconds(0);
    setDisplayTime('00:00:00');
    setTimerState('stopped');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();

    const dataToSubmit = {
      username: currentUser,
      ...state,
    };

    try {
      const response = await trackExercise(dataToSubmit);
      console.log(response.data);
      setMessage('✅ Exercise tracked successfully!');
      setState({
        exerciseType: '',
        description: '',
        duration: 0,
        date: new Date(),
      });
      if (timerMode === 'timer') {
        resetTimer();
      }
    } catch (error) {
      console.log(error);
      setMessage('❌ Failed to track exercise. Please try again.');
    }
  };

  // Activity options organized by category
  const activityCategories = [
    {
      label: "Popular Activities",
      activities: [
        { value: "Running", label: "🏃 Running", emoji: "🏃" },
        { value: "Cycling", label: "🚴 Cycling", emoji: "🚴" },
        { value: "Swimming", label: "🏊 Swimming", emoji: "🏊" },
        { value: "Gym", label: "🏋️ Gym", emoji: "🏋️" },
        { value: "Walking", label: "🚶 Walking", emoji: "🚶" },
      ]
    },
    {
      label: "Inclusive & Accessible",
      activities: [
        { value: "Wheelchair Run Pace", label: "♿ Wheelchair Run Pace", emoji: "♿", accessible: true },
        { value: "Wheelchair Walk Pace", label: "♿ Wheelchair Walk Pace", emoji: "♿", accessible: true },
      ]
    },
    {
      label: "Mind & Body",
      activities: [
        { value: "Stretching", label: "🧘 Stretching", emoji: "🧘" },
        { value: "Yoga", label: "🧘 Yoga", emoji: "🧘" },
        { value: "Mind & Body", label: "🧠 Mind & Body", emoji: "🧠" },
      ]
    },
    {
      label: "Strength & Cardio",
      activities: [
        { value: "Functional Strength", label: "💪 Functional Strength", emoji: "💪" },
        { value: "Core Training", label: "🎯 Core Training", emoji: "🎯" },
        { value: "HIIT", label: "⚡ HIIT", emoji: "⚡" },
        { value: "Dance", label: "💃 Dance", emoji: "💃" },
      ]
    }
  ];

  // Get selected activity emoji for display
  const getSelectedActivityEmoji = () => {
    // Check custom activities first
    const customActivity = customActivities.find(a => a.activityName === state.exerciseType);
    if (customActivity) return "⭐";

    // Check default activities
    for (const category of activityCategories) {
      const activity = category.activities.find(a => a.value === state.exerciseType);
      if (activity) return activity.emoji;
    }
    return "";
  };

  // Tooltip Helper Renderers
  const renderMicTooltip = (props) => (
    <Tooltip id="mic-tooltip" {...props}>
      {listening ? "Stop Recording and Parse Activity" : <>Use Voice Command<br />(e.g., 'I ran 30 minutes yesterday at the park')</>}
    </Tooltip>
  );

  const renderModeSwitchTooltip = (props) => (
    <Tooltip id="mode-switch-tooltip" {...props}>
      Switch to {timerMode === "manual" ? "Live Timer Mode" : "Manual Duration Entry"}
    </Tooltip>
  );

  const renderTimerTooltip = (buttonText, props) => (
    <Tooltip id="timer-tooltip" {...props}>
      {buttonText} the workout timer.
    </Tooltip>
  );

  const renderSaveTooltip = (props) => (
    <Tooltip id="save-tooltip" {...props}>
      Save the current activity.
    </Tooltip>
  );


  return (
    <div className="track-exercise-container">
      <div className="track-exercise-header">
        <h3 className="page-title">Track Exercise</h3>

        <OverlayTrigger placement="bottom" delay={{ show: 250, hide: 400 }} overlay={renderMicTooltip}>
          <IconButton
            onClick={toggleListening}
            className={`mic-button small ${listening ? "active" : ""}`}
            size="medium"
            aria-label="Record activity with voice"
          >
            {listening ? <MicOffIcon fontSize="small" /> : <MicIcon fontSize="small" />}
          </IconButton>
        </OverlayTrigger>
      </div>

      {listening && (
        <textarea
          className="speech-textarea"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Your speech will appear here..."
          rows={3}
          readOnly
        />
      )}

      <div>
        <Form onSubmit={onSubmit} className="exercise-form">

          {/* Date */}
          <Form.Group controlId="formDate" className="form-section">
            <Form.Label>Date</Form.Label>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enGB}>
              <DatePicker
                value={state.date}
                onChange={(date) => setState({ ...state, date })}
                renderInput={(params) => <Form.Control {...params} />}
                inputFormat="dd/MM/yyyy"
              />
            </LocalizationProvider>
          </Form.Group>


          {/* Activity Type - DROPDOWN VERSION */}
          <Form.Group controlId="formActivityType" className="form-section">
            <Form.Label className="activity-selector-label">
              <FitnessCenterIcon className="activity-label-icon" />
              Select Activity
              {state.exerciseType && (
                <span className="selected-activity-badge">
                  {getSelectedActivityEmoji()} {state.exerciseType}
                </span>
              )}
            </Form.Label>

            <Form.Select
              value={state.exerciseType}
              onChange={(e) => setState({ ...state, exerciseType: e.target.value })}
              required
              className="activity-dropdown"
              aria-label="Select activity type"
            >
              <option value="">Choose an activity...</option>

              {activityCategories.map((category, idx) => (
                <optgroup key={idx} label={category.label}>
                  {category.activities.map((activity) => (
                    <option
                      key={activity.value}
                      value={activity.value}
                      data-accessible={activity.accessible ? "true" : "false"}
                    >
                      {activity.label}
                    </option>
                  ))}
                </optgroup>
              ))}

              {customActivities.length > 0 && (
                <optgroup label="My Custom Activities">
                  {customActivities.map((activity) => (
                    <option key={activity._id} value={activity.activityName}>
                      ⭐ {activity.activityName}
                    </option>
                  ))}
                </optgroup>
              )}
            </Form.Select>

            <div className="activity-actions">
              <Button
                variant="outline-primary"
                size="sm"
                className="add-custom-btn"
                onClick={() => setShowCustomActivityModal(true)}
                type="button"
              >
                ➕ Add Custom Activity
              </Button>

              {customActivities.length > 0 && (
                <span className="custom-count-badge">
                  {customActivities.length} custom {customActivities.length === 1 ? 'activity' : 'activities'}
                </span>
              )}
            </div>
          </Form.Group>

          {/* Description */}
          <Form.Group controlId="description" className="form-section">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              required
              placeholder="Add details about your activity..."
              value={state.description}
              onChange={(e) => setState({ ...state, description: e.target.value })}
            />
          </Form.Group>

          {/* Duration */}
          <Form.Group controlId="duration" className="form-section">
            <div className="duration-header">
              <Form.Label>Duration (minutes)</Form.Label>
              <OverlayTrigger placement="left" delay={{ show: 250, hide: 400 }} overlay={renderModeSwitchTooltip}>
                <Button
                  variant="outline-primary"
                  className="toggle-mode-btn"
                  onClick={() => {
                    if (timerMode === "timer") stopTimer();
                    setTimerMode(timerMode === "manual" ? "timer" : "manual")
                  }}
                >
                  {timerMode === "manual" ? (
                    <>
                      <TimerIcon style={{ marginRight: "6px" }} />
                      Live Timer
                    </>
                  ) : (
                    <>
                      <AccessTimeIcon style={{ marginRight: "6px" }} />
                      Manual Entry
                    </>
                  )}
                </Button>
              </OverlayTrigger>
            </div>

            {timerMode === "manual" ? (
              <div className="duration-input-container">
                <Form.Control
                  type="number"
                  required
                  value={state.duration}
                  onChange={(e) => setState({ ...state, duration: e.target.value })}
                  placeholder="Duration in minutes"
                  className="duration-input"
                />
              </div>
            ) : (
              <div className="timer-container">
                <div className={`timer-display ${timerState}`}>{displayTime}</div>
                <div className="timer-controls">
                  {(timerState === "stopped" || timerState === "paused") && (
                    <OverlayTrigger
                      placement="bottom"
                      delay={{ show: 250, hide: 400 }}
                      overlay={(props) => renderTimerTooltip(timerState === "stopped" ? "Start" : "Resume", props)}
                    >
                      <Button
                        variant="primary"
                        onClick={startTimer}
                        style={{ minWidth: '100px' }}
                      >
                        {timerState === "stopped" ?
                          (<> <PlayArrowIcon style={{ marginRight: "5px" }} /> Start </>) :
                          (<> <PlayArrowIcon style={{ marginRight: "5px" }} /> Resume </>)
                        }
                      </Button>
                    </OverlayTrigger>
                  )}

                  {timerState === "running" && (
                    <OverlayTrigger placement="bottom" delay={{ show: 250, hide: 400 }} overlay={(props) => renderTimerTooltip("Pause", props)}>
                      <Button variant="warning" onClick={pauseTimer} style={{ minWidth: '100px' }}>
                        <PauseIcon style={{ marginRight: "5px" }} /> Pause
                      </Button>
                    </OverlayTrigger>
                  )}

                  {timerState !== "stopped" && (
                    <OverlayTrigger placement="bottom" delay={{ show: 250, hide: 400 }} overlay={(props) => renderTimerTooltip("Stop", props)}>
                      <Button variant="danger" onClick={stopTimer}>
                        <StopIcon style={{ marginRight: "5px" }} /> Stop
                      </Button>
                    </OverlayTrigger>
                  )}

                  {(timerState === "stopped" && timerSeconds > 0) && (
                    <OverlayTrigger placement="bottom" delay={{ show: 250, hide: 400 }} overlay={(props) => renderTimerTooltip("Reset", props)}>
                      <Button variant="outline-secondary" onClick={resetTimer}>
                        Reset
                      </Button>
                    </OverlayTrigger>
                  )}
                </div>
                {timerSeconds > 0 && timerState === "stopped" && (
                  <div className="timer-summary">Logged Duration: {Math.round(timerSeconds / 60)} minutes</div>
                )}
              </div>
            )}
          </Form.Group>


          {/* Submit */}
          <div className="form-actions">
            <OverlayTrigger placement="top" delay={{ show: 250, hide: 400 }} overlay={renderSaveTooltip}>
              <Button variant="primary" type="submit">
                Save Activity
              </Button>
            </OverlayTrigger>
          </div>
          {message && <p className="success-message">{message}</p>}

        </Form>
      </div>

      {/* Custom Activity Modal */}
      <CustomActivityModal
        show={showCustomActivityModal}
        onHide={() => setShowCustomActivityModal(false)}
        onActivityCreated={handleActivityCreated}
        currentUser={currentUser}
      />
    </div>


  );
};

export default TrackExercise;
