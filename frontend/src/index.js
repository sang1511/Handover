import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import socketManager from './utils/socket';

const token = localStorage.getItem('token');
if (token) socketManager.connect(token);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);