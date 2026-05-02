import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/index.css';

// Note: React.StrictMode is intentionally disabled. It double-invokes effects
// in development to surface bugs, which interacts poorly with D3's in-place
// mutation of graph data (forceLink replaces link.source/target string IDs
// with node object references). The current code clones graph data inside
// each effect, so this mostly doesn't matter — but disabling StrictMode
// removes one source of confusing double-init behaviour.
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
