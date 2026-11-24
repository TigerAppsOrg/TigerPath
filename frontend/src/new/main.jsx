import React from 'react';
import { createRoot } from 'react-dom/client';
import { applyTigerPathTheme, getStoredTigerPathTheme } from 'styles/theme';
import App from './App';

// Every color comes from theme CSS variables, so set them before the first paint.
// App re-applies the profile's theme once it loads.
applyTigerPathTheme(getStoredTigerPathTheme());

createRoot(document.getElementById('app')).render(<App />);
