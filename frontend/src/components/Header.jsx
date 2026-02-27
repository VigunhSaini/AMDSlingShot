import React, { useContext } from 'react';
import { Sun, Moon, Bell, Search, User } from 'lucide-react';
import { ThemeContext } from '../context/ThemeContext';
import './Components.css'; // Make sure styles are imported if we add specific header CSS

function Header() {
    const { theme, toggleTheme } = useContext(ThemeContext);

    return (
        <header className="top-header">

            <div className="header-actions">
                {/* Placeholder icons for a complex dashboard feel */}
                <button className="icon-action-btn">
                    <Search size={20} />
                </button>
                <button className="icon-action-btn">
                    <Bell size={20} />
                </button>

                <div className="vertical-divider"></div>

                <button
                    className="theme-toggle-btn"
                    onClick={toggleTheme}
                    aria-label="Toggle Theme"
                    title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                >
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                <div className="user-profile-btn">
                    <div className="avatar-circle">
                        <User size={18} />
                    </div>
                    <span>Admin</span>
                </div>
            </div>
        </header>
    );
}

export default Header;
