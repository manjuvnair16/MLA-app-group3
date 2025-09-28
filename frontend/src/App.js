import React from 'react';
import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import NavbarComponent from './components/navbar.js';
import TrackExercise from './components/trackExercise.js';
import Statistics from './components/statistics.js';
import Footer from './components/footer.js';
import Login from './components/login.js';
import Signup from './components/signup.js';
import Journal from './components/journal.js';
import logo from './img/CFG_logo.png'; // Update the path to your logo file

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState('');

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser('');
  };

  const handleLogin = (username) => {
    setIsLoggedIn(true);
    setCurrentUser(username);
  };

  return (
    <div className="App">
      <Router>
        <header className="appHeader">
          <div className="appHeader-left">
            <img src={logo} alt="CFG Fitness App Logo" id="appLogo" />
            <div className="appTitle">
              <h1>MLA Fitness App</h1>
            </div>
          </div>
          {isLoggedIn && (
            <div className="appHeader-right">
              <NavbarComponent onLogout={handleLogout} />
            </div>
          )}
        </header>

        {!isLoggedIn && (
          <section className="hero">
            <div className="hero-content">
              <h2>Track. Improve. Stay Consistent.</h2>
              <p>Log workouts in seconds and watch your progress grow with clear, motivating insights.</p>
            </div>
            <div className="hero-visual" aria-hidden="true">
              {/* Lightweight inline SVG illustration */}
              <svg viewBox="0 0 300 140" xmlns="http://www.w3.org/2000/svg" className="hero-svg">
                <defs>
                  <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(123,147,255,0.35)" />
                    <stop offset="100%" stopColor="rgba(64,91,255,0.35)" />
                  </linearGradient>
                </defs>
                <path d="M10 110 Q 40 20, 80 70 T 150 60 T 220 40 T 290 50" stroke="url(#grad)" strokeWidth="8" fill="none" strokeLinecap="round" />
                <circle cx="80" cy="70" r="6" fill="#7b93ff" />
                <circle cx="150" cy="60" r="6" fill="#7b93ff" />
                <circle cx="220" cy="40" r="6" fill="#7b93ff" />
              </svg>
            </div>
          </section>
        )}

        <div className="componentContainer">
          <Routes>
            <Route path="/login" element={isLoggedIn ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} />
            <Route path="/signup" element={isLoggedIn ? <Navigate to="/" /> : <Signup onSignup={(username) => {
              setIsLoggedIn(true);
              setCurrentUser(username);
            }} />} />
            <Route path="/trackExercise" element={isLoggedIn ? <TrackExercise currentUser={currentUser} /> : <Navigate to="/login" />} />
            <Route path="/statistics" element={isLoggedIn ? <Statistics currentUser={currentUser} /> : <Navigate to="/login" />} />
            <Route path="/journal" element={isLoggedIn ? <Journal currentUser={currentUser} /> : <Navigate to="/login" />} />
            <Route path="/" element={isLoggedIn ? <Navigate to="/trackExercise" /> : <Navigate to="/login" />} />
          </Routes>
        </div>
        <Footer />
      </Router>
    </div>
  );
}

export default App;
