import React, { useState, useEffect, useRef } from 'react';
import { Button, Form, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { trackExercise } from '../api.js';
import 'bootstrap/dist/css/bootstrap.min.css';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import BikeIcon from '@mui/icons-material/DirectionsBike';
import { IconButton } from '@mui/material';
import PoolIcon from '@mui/icons-material/Pool';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import OtherIcon from '@mui/icons-material/HelpOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import TimerIcon from '@mui/icons-material/Timer';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { enGB } from 'date-fns/locale';
import axios from 'axios';


const TrackExercise = ({ currentUser }) => {
  const [state, setState] = useState({
    exerciseType: '',
    description: '',
    duration: 0,
    date: new Date(),
  });
  const [message, setMessage] = useState('');

  // Speech to Text
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);

  const handleSpeechParse = async (transcript) => {
    try {
      const response = await fetch("http://localhost:5051/speech_to_text_parser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json", // important for Flask to parse JSON
        },
        body: JSON.stringify({ transcript }), // send transcript as JSON
      });
  
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
  
      const data = await response.json(); // parse JSON response
      const parsed = data.parsed;
      console.log("Parsed activity:", parsed);

      if (parsed) {
        // Check for invalid / random input
        if (!parsed.exerciseType || !parsed.duration || !parsed.date || !parsed.description){
          alert("❗ That doesn’t look like a valid fitness activity or it is missing some details (activity type, duration, date, description). Please try again.");
          return;
        }
        let parsedDate = null;
        if (parsed.date) {             
          const parts = parsed.date.split('/');
          const year = parseInt(parts[0]);
          const monthIndex = parseInt(parts[1]) - 1; // Month is 0-indexed (9 for October)
          const day = parseInt(parts[2]);

          // Set the time to 03:00:00 AM local time  (adding this as else the time is default to 00:00:00 which pushes the date to minus 1 day)
          const hour = 3;
          const minute = 0;
          const second = 0;

          parsedDate = new Date(year, monthIndex, day, hour, minute, second);
        }
        else {
          parsedDate = null;
        }
        // Set individual states with parsed values
        setState(prev => ({
          ...prev,
          exerciseType: parsed.exerciseType || prev.exerciseType,
          duration: parsed.duration || prev.duration,
          description: parsed.description || prev.description,
          date: parsedDate || prev.date,
        }));
      }
      else{
        // Check for invalid / random input
        if (!parsed.exerciseType || !parsed.duration || !parsed.date || !parsed.description){
          alert("❗ That doesn’t look like a valid fitness activity or it is missing some details (activity type, duration, date, description). Please try again.");
        }
      }
  } catch (err) {
      console.error("Parsing failed:", err);
    }
  };

  useEffect(() => {
    // Initialize SpeechRecognition
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
      // if speech to text transcript is not empty
      if (transcript.trim().length !== 0) {
        handleSpeechParse(transcript); 
      }
    } else {
      setTranscript(""); // Clear previous transcript if desired
      recognition.start();
      setListening(true);
    }
  };

  
  // Timer state
  const [timerMode, setTimerMode] = useState('manual'); // 'manual' or 'timer'
  const [timerState, setTimerState] = useState('stopped'); // 'stopped', 'running', 'paused'
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
    // Convert seconds to minutes and update duration
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

  // Cleanup interval on component unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();

// Ensure ISO string but in **GMT** (not browser local)
const dataToSubmit = {
  username: currentUser,
  ...state,
};

    try {
      const response = await trackExercise(dataToSubmit);
      console.log(response.data);

      setState({
        exerciseType: '',
        description: '',
        duration: 0,
        date: new Date(),
      });

      // Reset timer if it was used
      if (timerMode === 'timer') {
        resetTimer();
        setTimerMode('manual');
      }

      setMessage('Activity logged successfully! Well done!');
      setTimeout(() => setMessage(''), 2000);

    } catch (error) {
      console.error('There was an error logging your activity!', error);
    }
  };
  
  // Array of activity definitions
  const activities = [
    { name: "Running", icon: <DirectionsRunIcon fontSize="small" />, tooltip: "Outdoor or Treadmill Running" },
    { name: "Cycling", icon: <BikeIcon fontSize="small" />, tooltip: "Road Biking or Stationary Cycling" },
    { name: "Swimming", icon: <PoolIcon fontSize="small" />, tooltip: "Pool or Open Water Swimming" },
    { name: "Gym", icon: <FitnessCenterIcon fontSize="small" />, tooltip: "Weightlifting, Cardio Machines, or Classes" },
    { name: "Other", icon: <OtherIcon fontSize="small" />, tooltip: "Any activity not listed (e.g., Yoga, Hiking)" },
  ];

  // Tooltip Helper Renderers
  const renderMicTooltip = (props) => (
    <Tooltip id="mic-tooltip" {...props}>
      {listening ? "Stop Recording and Parse Activity" : <>Use Voice Command<br/>(e.g., 'I ran 30 minutes yesterday at the park')</>}
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

      {/* Speech section only when mic is active */}
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


      {/* Activity Type - Updated to use clearer buttons */}
      <Form.Group controlId="formActivityType" className="form-section">
        <Form.Label>Select Activity</Form.Label>
        <div className="activity-selector">
          {activities.map((item) => ( 
              <button
                type="button" // Important to prevent form submission
                className={`activity-chip-button ${state.exerciseType === item.name ? "active" : ""}`}
                onClick={() => setState({ ...state, exerciseType: item.name })}
              >
                {item.icon} {item.name}
              </button>
          ))}
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
              if (timerMode === "timer") stopTimer(); // Stop timer when switching away from it
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
            {/* Start/Resume */}
            {(timerState === "stopped" || timerState === "paused") && (
              <OverlayTrigger 
                placement="bottom" 
                delay={{ show: 250, hide: 400 }} 
                overlay={(props) => renderTimerTooltip(timerState === "stopped" ? "Start" : "Resume", props)}
              >
                <Button 
                  variant="primary" 
                  onClick={startTimer}
                  style={{ minWidth: '100px' }} // Give it a fixed width
                >
                  {timerState === "stopped" ? 
                    (<> <PlayArrowIcon style={{ marginRight: "5px" }} /> Start </>) :
                    (<> <PlayArrowIcon style={{ marginRight: "5px" }} /> Resume </>)
                  }
                </Button>
              </OverlayTrigger>
            )}

            {/* Pause */}
            {timerState === "running" && (
              <OverlayTrigger placement="bottom" delay={{ show: 250, hide: 400 }} overlay={(props) => renderTimerTooltip("Pause", props)}>
                <Button variant="warning" onClick={pauseTimer} style={{ minWidth: '100px' }}>
                  <PauseIcon style={{ marginRight: "5px" }} /> Pause
                </Button>
              </OverlayTrigger>
            )}

            {/* Stop and Reset */}
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
          {/* Summary should always be visible when timer is not 0 */}
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
</div>


  );
};

export default TrackExercise;