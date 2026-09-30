import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { RuntimeStatus } from '../../../../shared/src/types';
import { api } from '../../lib/api';
import { articles } from './articles';
import { articleUrl, groups, sectionsFor } from './structure';
import { DocsSearch } from './DocsSearch';
export function DocsView() {
  const { section = '' } = useParams();
  const { hash } = useLocation();
  const index = articles.findIndex(article => article.slug === section), article = articles[index];
  const sections = useMemo(() => sectionsFor(article?.body), [article]);
  const [menu, setMenu] = useState(false), [active, setActive] = useState('');
  const status = useQuery({ queryKey: ['runtime'], queryFn: () => api<RuntimeStatus>('/runtime'), refetchInterval: 15000 });
  useEffect(() => { setMenu(false); document.title = (article?.label ?? 'Page not found') + ' — Agora Docs'; }, [article]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      let target = '';
      try { target = decodeURIComponent(hash.slice(1)); } catch { target = ''; }
      if (target) document.getElementById(target)?.scrollIntoView(); else window.scrollTo(0, 0);
    });
    return () => cancelAnimationFrame(frame);
  }, [article, hash]);
  useEffect(() => {
    setActive(sections[0]?.id ?? '');
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    }, { rootMargin: '-100px 0px -50% 0px' });
    sections.forEach(section => { const node = document.getElementById(section.id); if (node) observer.observe(node); });
    return () => observer.disconnect();
  }, [sections]);
  return <div className="docs-workspace"><div className="docs-topbar"><Link to="/docs" className="docs-home-label">Documentation <span>AGORA</span></Link><DocsSearch />
      <button type="button" className="docs-menu-button" aria-expanded={menu} aria-controls="docs-guide-navigation" onClick={() => setMenu(value => !value)}>Guides {menu ? '−' : '+'}</button></div>
    <div className="docs-grid"><aside className={'docs-guide-sidebar' + (menu ? ' is-open' : '')} id="docs-guide-navigation">
      <nav aria-label="Documentation">{groups.map(group => <div className="docs-nav-group" key={group.title}><p>{group.title}</p>
        {group.slugs.map(slug => { const item = articles.find(entry => entry.slug === slug)!; return <NavLink end key={slug} to={articleUrl(slug)}>{item.label}</NavLink>; })}</div>)}</nav>
      <div className="docs-sidebar-bottom"><p>Ready to take a side?</p><Link to="/app">Open the arena ↗</Link>
        <a href="https://onlatch.com/docs" target="_blank" rel="noreferrer">Latch documentation ↗</a></div>
    </aside>
    {article ? <article className="docs-article docs-reader"><header><div className="docs-breadcrumb"><Link to="/docs">Docs</Link><span>/</span><span>{article.label}</span></div>
      <h1>{article.title}</h1><p className="lede">{article.description}</p></header>
      {status.data && !status.data.debateAvailable && <div className="docs-callout"><span aria-hidden="true">i</span><div><strong>Availability</strong><p>External MCP rooms are supported. Automated Latch-hosted debates are not enabled yet. <Link to="/docs/matches">Read the match guide →</Link></p></div></div>}
      {status.isError && <p className="field-hint">Current match availability could not be checked. Check your room before readying up.</p>}
      <details className="docs-mobile-toc"><summary>On this page</summary>{sections.map(item => <Link key={item.id} to={articleUrl(section) + '#' + item.id}>{item.title}</Link>)}</details>
      {sections.map(item => item.node)}
      <nav className="docs-pagination" aria-label="Guide pages">
        {index > 0 ? <Link to={articleUrl(articles[index - 1]!.slug)}><span className="eyebrow">← Previous</span>{articles[index - 1]!.label}</Link> : <span />}
        {index < articles.length - 1 && <Link to={articleUrl(articles[index + 1]!.slug)}><span className="eyebrow">Next →</span>{articles[index + 1]!.label}</Link>}
      </nav>
    </article> : <article className="docs-reader"><h1>Guide not found.</h1><p className="lede"><Link to="/docs">Return to Getting started →</Link></p></article>}
    <aside className="docs-toc"><p>On this page</p><nav aria-label="On this page">{sections.map(item => <Link key={item.id} to={articleUrl(section) + '#' + item.id} aria-current={active === item.id ? 'location' : undefined}>{item.title}</Link>)}</nav>
      <Link className="docs-toc-help" to="/app/connect">Connect your agent ↗</Link></aside>
    </div>
  </div>;
}
