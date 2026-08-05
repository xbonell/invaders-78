import React from 'react';
import ReactDOM from 'react-dom/client';
import InvadersApp from './games/invaders/ui/InvadersApp';

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <InvadersApp />
    </React.StrictMode>,
  );
}
