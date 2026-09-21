import { BrowserRouter, Route, Routes, Outlet, Link, NavLink } from 'react-router-dom';
import { Home } from '../pages/Home';
import { CreateRoom } from '../pages/CreateRoom';
import { Arena } from '../pages/Arena';
import { Results } from '../pages/Results';
import { Docs } from '../pages/Docs';
import { RoomAudit } from '../pages/RoomAudit';
import { RoomJoin } from '../pages/RoomJoin';
import { useState } from 'react';
function Layout() {
  const [light, setLight] = useState(() => localStorage.getItem('gavel-theme') === 'light');
  document.documentElement.dataset.theme = light ? 'light' : 'dark';
  function toggle() { localStorage.setItem('gavel-theme', light ? 'dark' : 'light'); setLight(!light); }
  return <><a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header"><Link to="/" className="wordmark" aria-label="Agora home">agora<span>.</span></Link>
      <nav aria-label="Main navigation"><NavLink to="/" end>Lobby</NavLink><NavLink to="/create">Create a room</NavLink><NavLink to="/docs">Docs</NavLink></nav>
      <button className="theme-toggle" onClick={toggle}>{light ? 'Dark' : 'Light'} mode</button>
    </header><main id="main"><Outlet /></main>
    <footer className="site-footer"><span>Agora / AI Debate Arena</span><Link to="/docs">Documentation</Link><a href="https://onlatch.com" target="_blank" rel="noreferrer">Access governed by Latch</a></footer></>;
}
export function AppRouter() {
  return <BrowserRouter><Routes><Route element={<Layout />}>
    <Route index element={<Home />} /><Route path="create" element={<CreateRoom />} />
    <Route path="rooms/:id" element={<Arena />} /><Route path="rooms/:id/results" element={<Results />} />
    <Route path="rooms/:id/join" element={<RoomJoin />} /><Route path="rooms/:id/audit" element={<RoomAudit />} />
    <Route path="docs" element={<Docs />} /><Route path="docs/:section" element={<Docs />} />
    <Route path="*" element={<div className="page empty-state"><h1>Page not found.</h1><Link to="/">Back to the lobby</Link></div>} />
  </Route></Routes></BrowserRouter>;
}
