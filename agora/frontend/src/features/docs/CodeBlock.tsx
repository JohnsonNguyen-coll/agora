import { useState } from 'react';
export function CodeBlock({ code, label = 'Terminal' }: { code: string; label?: string }) {
  const [message, setMessage] = useState('Copy');
  async function copy() { try { await navigator.clipboard.writeText(code); setMessage('Copied'); } catch { setMessage('Select text to copy'); } }
  return <div className="docs-code"><div><span>{label}</span><button type="button" onClick={() => void copy()} aria-live="polite">{message}</button></div><pre><code>{code}</code></pre></div>;
}
