import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { searchEntries } from './structure';
export function DocsSearch() {
  const [open, setOpen] = useState(false), [query, setQuery] = useState('');
  const ref = useRef<HTMLDialogElement>(null), input = useRef<HTMLInputElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const results = words.length ? searchEntries.filter(entry => words.every(word => (entry.title + ' ' + entry.text).toLowerCase().includes(word))).slice(0, 10) : searchEntries.filter(entry => !entry.url.includes('#'));
  function close() { setOpen(false); ref.current?.close(); trigger.current?.focus(); }
  useEffect(() => {
    const handler = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setOpen(value => !value); }
    };
    addEventListener('keydown', handler); return () => removeEventListener('keydown', handler);
  }, []);
  useEffect(() => {
    if (open) { ref.current?.showModal(); input.current?.focus(); }
    else ref.current?.close();
  }, [open]);
  function keyboard(event: KeyboardEvent<HTMLDialogElement>) {
    const links = Array.from(ref.current?.querySelectorAll<HTMLAnchorElement>('.docs-search-results a') ?? []);
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (event.key === 'ArrowDown') { event.preventDefault(); links[Math.min(index + 1, links.length - 1)]?.focus(); }
    if (event.key === 'ArrowUp') { event.preventDefault(); if (index <= 0) input.current?.focus(); else links[index - 1]?.focus(); }
    if (event.key === 'Tab') {
      const nodes = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('input,button,a[href]'));
      if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes.at(-1)?.focus(); }
      if (!event.shiftKey && document.activeElement === nodes.at(-1)) { event.preventDefault(); nodes[0]?.focus(); }
    }
  }
  return <><button ref={trigger} type="button" className="docs-search-trigger" onClick={() => setOpen(true)}><span>⌕ <span>Search documentation</span></span><kbd>Ctrl K</kbd></button>
    <dialog className="docs-search-dialog" ref={ref} aria-label="Search documentation" onKeyDown={keyboard} onCancel={event => { event.preventDefault(); close(); }}>
      <div className="docs-search-input"><input ref={input} value={query} onChange={event => setQuery(event.target.value)} aria-label="Search documentation" placeholder="Search guides, setup, room rules…" />
        <button type="button" onClick={close} aria-label="Close search">Esc</button></div>
      <p className="docs-search-summary" role="status">{words.length ? results.length ? 'Matching sections' : 'No matching sections. Try “token”, “MCP” or “voting”.' : 'Explore the guides'}</p>
      <div className="docs-search-results">{results.map(result => <Link key={result.url} to={result.url} onClick={close}><strong>{result.title}</strong><span>{result.description}</span><b aria-hidden="true">↗</b></Link>)}</div>
      <div className="docs-search-footer">↑ ↓ Navigate <span>Enter to open · Esc to close</span></div>
    </dialog></>;
}
