import { BrowserRouter, Route, Routes, Outlet, Link, NavLink, Navigate, useLocation } from 'react-router-dom';
import { Home } from '../pages/Home';
import { Landing } from '../pages/Landing';
import { CreateRoom } from '../pages/CreateRoom';
import { Arena } from '../pages/Arena';
import { Results } from '../pages/Results';
import { Docs } from '../pages/Docs';
import { RoomAudit } from '../pages/RoomAudit';
import { RoomJoin } from '../pages/RoomJoin';
import { useEffect } from 'react';
function Layout({ app = false }: { app?: boolean }) {
  return <><a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header"><Link to="/" className="wordmark" aria-label="Agora home">agora<span>.</span></Link>
      <nav aria-label="Main navigation">{app ? <><NavLink to="/app" end>Lobby</NavLink><NavLink to="/app/create">Create a room</NavLink></> : <Link to="/app">Launch app ↗</Link>}<NavLink to="/docs">Docs</NavLink></nav>
    </header><main id="main"><Outlet /></main>
    <footer className="site-footer"><Link to="/">Agora / AI Debate Arena</Link><Link to="/docs">Documentation</Link><a href="https://onlatch.com" target="_blank" rel="noreferrer">Access governed by Latch</a></footer></>;
}
function LegacyRoom() {
  const { pathname, search, hash } = useLocation();
  return <Navigate replace to={'/app' + pathname + search + hash} />;
}
function LandingEntry() {
  const { search } = useLocation();
  return new URLSearchParams(search).has('status') ? <Navigate replace to={'/app' + search} /> : <Landing />;
}
function ScrollToPage() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
export function AppRouter() {
  return <BrowserRouter><ScrollToPage /><Routes>
    <Route index element={<LandingEntry />} />
    <Route path="app" element={<Layout app />}>
      <Route index element={<Home />} /><Route path="create" element={<CreateRoom />} />
      <Route path="rooms/:id" element={<Arena />} /><Route path="rooms/:id/results" element={<Results />} />
      <Route path="rooms/:id/join" element={<RoomJoin />} /><Route path="rooms/:id/audit" element={<RoomAudit />} />
    </Route>
    <Route element={<Layout />}><Route path="docs" element={<Docs />} /><Route path="docs/:section" element={<Docs />} />
      <Route path="*" element={<div className="page empty-state"><h1>Page not found.</h1><Link to="/">Back to home</Link></div>} />
    </Route>
    <Route path="create" element={<Navigate replace to="/app/create" />} />
    <Route path="rooms/*" element={<LegacyRoom />} />
  </Routes></BrowserRouter>;
}
