import React, { useState, useEffect, useRef } from 'react';
import { Button, Form, ToggleButton, ToggleButtonGroup } from 'react-bootstrap';
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
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { enGB } from 'date-fns/locale';

const TrackExercise = ({ currentUser }) => {
  const [state, setState] = useState({
    exerciseType: '',
    description: '',
    duration: 0,
    date: new Date(),
  });
  const [message, setMessage] = useState('');
  
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

  return (
    <div>
      <h3>Track exercise</h3>
      <Form onSubmit={onSubmit} style={{ maxWidth: '400px', margin: 'auto' }}>

        <Form.Group controlId="formDate" className="form-margin">
          <Form.Label>Date:</Form.Label>
          <div>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enGB}>
              <DatePicker
                value={state.date}
                onChange={(date) => setState({ ...state, date })}
                renderInput={(params) => <Form.Control {...params} />}
                inputFormat="yyyy/MM/dd"
              />
            </LocalizationProvider>
          </div>
        </Form.Group>
        <div style={{ marginBottom: '20px' }}>
          <span className={`icon-chip ${state.exerciseType === 'Running' ? 'active' : ''}`}>
            <IconButton color="inherit" onClick={() => setState({ ...state, exerciseType: 'Running' })}>
              <DirectionsRunIcon fontSize="large" />
            </IconButton>
          </span>
          <span className={`icon-chip ${state.exerciseType === 'Cycling' ? 'active' : ''}`}>
            <IconButton color="inherit" onClick={() => setState({ ...state, exerciseType: 'Cycling' })}>
              <BikeIcon fontSize="large" />
            </IconButton>
          </span>
          <span className={`icon-chip ${state.exerciseType === 'Swimming' ? 'active' : ''}`}>
            <IconButton color="inherit" onClick={() => setState({ ...state, exerciseType: 'Swimming' })}>
              <PoolIcon fontSize="large" />
            </IconButton>
          </span>
          <span className={`icon-chip ${state.exerciseType === 'Gym' ? 'active' : ''}`}>
            <IconButton color="inherit" onClick={() => setState({ ...state, exerciseType: 'Gym' })}>
              <FitnessCenterIcon fontSize="large" />
            </IconButton>
          </span>
          <span className={`icon-chip ${state.exerciseType === 'Other' ? 'active' : ''}`}>
            <IconButton color="inherit" onClick={() => setState({ ...state, exerciseType: 'Other' })}>
              <OtherIcon fontSize="large" />
            </IconButton>
          </span>
        </div>
        <Form.Group controlId="description" style={{ marginBottom: '20px' }}>
          <Form.Label>Description:</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            required
            value={state.description}
            onChange={(e) => setState({ ...state, description: e.target.value })}
          />
        </Form.Group>
        <Form.Group controlId="duration" style={{ marginBottom: '40px' }}>
          <Form.Label>Duration(in minutes):</Form.Label>
          
          {/* Mode Toggle */}
          <div style={{ marginBottom: '15px' }}>
            <ToggleButtonGroup
              type="radio"
              name="durationMode"
              value={timerMode}
              onChange={(val) => setTimerMode(val)}
              style={{ marginBottom: '10px' }}
            >
              <ToggleButton id="manual-mode" value="manual" variant="outline-primary">
                <AccessTimeIcon style={{ marginRight: '5px' }} />
                Manual Entry
              </ToggleButton>
              <ToggleButton id="timer-mode" value="timer" variant="outline-primary">
                <TimerIcon style={{ marginRight: '5px' }} />
                Live Timer
              </ToggleButton>
            </ToggleButtonGroup>
          </div>

          {/* Manual Duration Input */}
          {timerMode === 'manual' && (
            <Form.Control
              type="number"
              required
              value={state.duration}
              onChange={(e) => setState({ ...state, duration: e.target.value })}
              placeholder="Enter duration in minutes"
            />
          )}

          {/* Timer Interface */}
          {timerMode === 'timer' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '2rem', 
                fontWeight: 'bold', 
                marginBottom: '15px',
                fontFamily: 'monospace',
                color: timerState === 'running' ? '#28a745' : '#6c757d'
              }}>
                {displayTime}
              </div>
              
              <div style={{ marginBottom: '10px' }}>
                {timerState === 'stopped' && (
                  <Button 
                    variant="success" 
                    onClick={startTimer}
                    style={{ marginRight: '10px' }}
                  >
                    <PlayArrowIcon style={{ marginRight: '5px' }} />
                    Start
                  </Button>
                )}
                
                {timerState === 'running' && (
                  <>
                    <Button 
                      variant="warning" 
                      onClick={pauseTimer}
                      style={{ marginRight: '10px' }}
                    >
                      <PauseIcon style={{ marginRight: '5px' }} />
                      Pause
                    </Button>
                    <Button 
                      variant="danger" 
                      onClick={stopTimer}
                      style={{ marginRight: '10px' }}
                    >
                      <StopIcon style={{ marginRight: '5px' }} />
                      Stop
                    </Button>
                  </>
                )}
                
                {timerState === 'paused' && (
                  <>
                    <Button 
                      variant="success" 
                      onClick={startTimer}
                      style={{ marginRight: '10px' }}
                    >
                      <PlayArrowIcon style={{ marginRight: '5px' }} />
                      Resume
                    </Button>
                    <Button 
                      variant="danger" 
                      onClick={stopTimer}
                      style={{ marginRight: '10px' }}
                    >
                      <StopIcon style={{ marginRight: '5px' }} />
                      Stop
                    </Button>
                  </>
                )}
                
                {(timerState === 'paused' || timerState === 'stopped') && timerSeconds > 0 && (
                  <Button 
                    variant="outline-secondary" 
                    onClick={resetTimer}
                  >
                    Reset
                  </Button>
                )}
              </div>
              
              {timerState === 'stopped' && timerSeconds > 0 && (
                <div style={{ 
                  fontSize: '0.9rem', 
                  color: '#28a745',
                  marginTop: '10px'
                }}>
                  Duration: {Math.round(timerSeconds / 60)} minutes
                </div>
              )}
            </div>
          )}
        </Form.Group>
        <Button variant="success" type="submit">
          Save activity
        </Button>
      </Form>
      {message && <p style={{ color: 'green' }}>{message}</p>}
    </div>
  );
};

export default TrackExercise;
