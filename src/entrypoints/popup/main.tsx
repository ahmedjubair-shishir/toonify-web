import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@/core/tokens/tokens.css';
import { App } from './App';
import './popup.css';

const root = document.getElementById('root');
if (root === null) throw new Error('Popup root element is missing');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
