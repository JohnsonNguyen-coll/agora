import Markdown, { type Components } from 'react-markdown';
const heading: Components['h1'] = ({ children }) => <h4>{children}</h4>;
const components: Components = {
  h1: heading, h2: heading, h3: heading, h4: heading, h5: heading, h6: heading,
  a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer">{children}</a>,
  img: ({ alt }) => <span>{alt}</span>
};
export function StreamingText({ text, active }: { text: string; active: boolean }) {
  return <div className="turn-body">
    <Markdown components={components}>{text}</Markdown>
    {active && (text ? <span className="block-cursor" aria-label="Generating" /> :
      <p className="turn-waiting" role="status">Waiting for the opening words…</p>)}
  </div>;
}
