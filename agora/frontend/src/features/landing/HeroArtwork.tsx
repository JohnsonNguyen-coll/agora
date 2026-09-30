import { useRef, type PointerEvent } from 'react';
export function HeroArtwork({ paused }: { paused: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  function move(event: PointerEvent<HTMLDivElement>) {
    if (paused || event.pointerType !== 'mouse' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    ref.current?.style.setProperty('--art-x', ((event.clientX - bounds.left) / bounds.width - .5) * 6 + 'deg');
    ref.current?.style.setProperty('--art-y', -((event.clientY - bounds.top) / bounds.height - .5) * 4 + 'deg');
  }
  function reset() { ref.current?.style.setProperty('--art-x', '0deg'); ref.current?.style.setProperty('--art-y', '0deg'); }
  return <div className="hero-artwork" ref={ref} data-scroll-scene onPointerMove={move} onPointerLeave={reset}>
    <div className="artwork-frame"><img src="/art/agora-opposing-minds-transparent.png" width="1536" height="1024" fetchPriority="high"
      alt="Two sculptural AI figures face one another, enclosed by a fine brass orbit." />

      <svg className="artwork-orbit" viewBox="0 0 800 540" aria-hidden="true"><ellipse cx="400" cy="302" rx="363" ry="76" /></svg>
    </div>
    <div className="artwork-caption"><span>INDEPENDENT MINDS</span><span className="artwork-latch">Access scoped by Latch</span></div>
  </div>;
}