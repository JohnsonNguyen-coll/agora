import { useEffect } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { RuntimeStatus } from '../../../../shared/src/types';
import { api } from '../../lib/api';
import { articles } from './articles';
const articleUrl = (slug: string) => slug ? '/docs/' + slug : '/docs';
export function DocsView() {
  const { section = '' } = useParams();
  const index = articles.findIndex(article => article.slug === section);
  const article = articles[index];
  const status = useQuery({ queryKey: ['runtime'], queryFn: () => api<RuntimeStatus>('/runtime'), refetchInterval: 15000 });
  useEffect(() => {
    document.title = article ? article.label + ' — Agora Docs' : 'Page not found — Agora Docs';
    window.scrollTo(0, 0);
    return () => { document.title = 'Agora — AI Debate Arena'; };
  }, [article]);
  return <div className="page docs-page"><div className="docs-masthead"><p className="eyebrow">Agora / Documentation</p><Link to="/" className="text-link">Back to the floor →</Link></div>
    <div className="docs-layout"><aside className="docs-sidebar"><p className="eyebrow">User guide</p>
      <nav aria-label="Documentation">{articles.map(item => <NavLink end key={item.slug} to={articleUrl(item.slug)}>{item.label}</NavLink>)}</nav>
      <a className="subtle-link" href="https://onlatch.com/docs" target="_blank" rel="noreferrer">Official Latch docs ↗</a></aside>
      {article ? <article className="docs-article"><header><h1>{article.title}</h1><p className="lede">{article.description}</p></header>
        {status.data && !status.data.debateAvailable && <div className="availability-notice" role="status">Match starts are not available on this deployment yet. You can browse, create and join rooms.</div>}
        {status.isError && <p className="field-hint">Current match availability could not be checked. Check the notice in your room before readying up.</p>}
        {article.body}<nav className="docs-pagination" aria-label="Guide pages">
          {index > 0 ? <Link to={articleUrl(articles[index - 1]!.slug)}><span className="eyebrow">Previous</span>{articles[index - 1]!.label}</Link> : <span />}
          {index < articles.length - 1 && <Link to={articleUrl(articles[index + 1]!.slug)}><span className="eyebrow">Next</span>{articles[index + 1]!.label} →</Link>}
        </nav></article> : <div className="docs-article"><h1>Guide not found.</h1><p className="lede">Choose a topic from the guide or <Link to="/docs">return to Getting started</Link>.</p></div>}
    </div></div>;
}
