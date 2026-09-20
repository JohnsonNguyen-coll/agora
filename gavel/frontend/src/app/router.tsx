import { BrowserRouter, Route, Routes, Outlet, Link, NavLink } from 'react-router-dom';
import { Home } from '../pages/Home';
import { CreateRoom } from '../pages/CreateRoom';
import { Arena } from '../pages/Arena';
import { Results } from '../pages/Results';
import { useState } from 'react';
function Layout() {
  const [light, setLight] = useState(() => localStorage.getItem('gavel-theme') === 'light');
  const theme = light ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  function toggle() { localStorage.setItem('gavel-theme', light ? 'dark' : 'light'); setLight(!light); }
  return <><a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header"><Link to="/" className="wordmark" aria-label="Gavel home">gavel<span>.</span></Link>
      <nav aria-label="Main navigation"><NavLink to="/" end>Lobby</NavLink><NavLink to="/create">Create a room</NavLink></nav>
      <button className="theme-toggle" onClick={toggle}>{light ? 'Dark' : 'Light'} mode</button>
    </header><main id="main"><Outlet /></main>
    <footer className="site-footer"><span>Gavel / AI Debate Arena</span><a href="https://onlatch.com" target="_blank" rel="noreferrer">Access governed by Latch</a></footer></>;
}
export function AppRouter() {
  return <BrowserRouter><Routes><Route element={<Layout />}>
    <Route index element={<Home />} /><Route path="create" element={<CreateRoom />} />
    <Route path="rooms/:id" element={<Arena />} /><Route path="rooms/:id/results" element={<Results />} />
    <Route path="*" element={<div className="page empty-state"><h1>Room not found.</h1><Link to="/">Back to the lobby</Link></div>} />
  </Route></Routes></BrowserRouter>;
}
