import React from 'react';
import { useTheme } from '../context/ThemeContext';
import './NightDayToggle.css';

export default function NightDayToggle() {
  const { isNight, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className={`night-day-toggle ${isNight ? 'is-night' : 'is-day'}`}
      onClick={toggleTheme}
      title={isNight ? "Switch to Day Mode" : "Switch to Night Mode"}
      aria-label="Toggle Night and Day Mode"
    >
      <div className="toggle-track">
        <div className="toggle-thumb">
          {isNight ? (
            <span className="icon-moon">🌙</span>
          ) : (
            <span className="icon-sun">☀️</span>
          )}
        </div>
        <span className="mode-label">{isNight ? "Night" : "Day"}</span>
      </div>
    </button>
  );
}
