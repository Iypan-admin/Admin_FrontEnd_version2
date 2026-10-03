import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Suppress harmless WebRTC teardown errors on page reload/navigation
window.addEventListener('unhandledrejection', (event) => {
  const reasonStr = event?.reason?.message || String(event?.reason || '');
  if (
    reasonStr.includes('PC manager is closed') ||
    reasonStr.includes('UnexpectedConnectionState') ||
    reasonStr.includes('could not establish data channel') ||
    reasonStr.includes('data transport is not ready')
  ) {
    event.preventDefault();
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
