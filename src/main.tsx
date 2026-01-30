import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

console.log('[Main] Starting React app...');
console.log('[Main] Root element:', document.getElementById('root'));

try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('[Main] React app rendered successfully');
} catch (error) {
  console.error('[Main] Failed to render React app:', error);
}
