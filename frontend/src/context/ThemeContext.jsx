import React, { createContext, useState, useEffect } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        // Check local storage for saved theme, default to dark
        const savedTheme = localStorage.getItem('smart-campus-theme');
        return savedTheme || 'dark';
    });

    useEffect(() => {
        // Apply theme class to document body
        document.body.className = `theme-${theme}`;
        localStorage.setItem('smart-campus-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
