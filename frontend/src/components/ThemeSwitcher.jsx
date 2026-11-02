import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import './ThemeSwitcher.css';

export default function ThemeSwitcher() {
  const { theme, changeTheme, themes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const activeTheme = themes.find(t => t.id === theme) || themes[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="theme-switcher-container" ref={dropdownRef}>
      <button 
        className="theme-switcher-trigger" 
        onClick={() => setIsOpen(!isOpen)}
        title="Change Theme Color"
        type="button"
      >
        <span 
          className="theme-dot" 
          style={{ backgroundColor: activeTheme.accent }}
        />
        <span className="theme-trigger-text">Theme</span>
        <svg 
          className={`theme-chevron ${isOpen ? 'open' : ''}`} 
          width="14" 
          height="14" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {isOpen && (
        <div className="theme-dropdown animate-pop-in">
          <div className="theme-dropdown-header">
            <span>Color Palette</span>
          </div>
          <div className="theme-options">
            {themes.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`theme-option-btn ${theme === t.id ? 'active' : ''}`}
                onClick={() => {
                  changeTheme(t.id);
                  setIsOpen(false);
                }}
              >
                <div className="theme-swatch" style={{ background: t.preview, borderColor: t.accent }}>
                  <span className="swatch-accent" style={{ background: t.accent }} />
                </div>
                <span className="theme-option-name">{t.name}</span>
                {theme === t.id && (
                  <svg className="theme-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
