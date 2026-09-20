import { useEffect, useState } from 'react';
export function StreamingText({ text, active }: { text: string; active: boolean }) {
  const [length, setLength] = useState(active ? 0 : text.length);
  useEffect(() => {
    if (!active) { setLength(text.length); return; }
    if (length >= text.length) return;
    const timer = setTimeout(() => setLength(value => Math.min(value + 1, text.length)), 8);
    return () => clearTimeout(timer);
  }, [text, active, length]);
  return <p className="turn-body">{active ? text.slice(0, length) : text}{active && <span className="block-cursor" aria-label="Generating" />}</p>;
}
