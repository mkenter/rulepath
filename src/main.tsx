import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource-variable/instrument-sans';
import '@fontsource-variable/newsreader/opsz.css';

import { App } from './app/App';
import './styles/tokens.css';
import './styles/base.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Application root element was not found');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
