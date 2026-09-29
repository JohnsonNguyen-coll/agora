import React from 'react';
import ReactDOM from 'react-dom/client';
import { Providers } from './app/providers';
import { AppRouter } from './app/router';
import './styles/tokens.css';
import './styles/globals.css';
import './styles/arena.css';
import './styles/spectator.css';
import './styles/docs.css';
import './styles/landing.css';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><Providers><AppRouter /></Providers></React.StrictMode>
);

import './styles/brand.css';
import './styles/landing-motion.css';
import './styles/refinement.css';
