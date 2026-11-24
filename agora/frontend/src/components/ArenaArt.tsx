import { useId, useRef, useState, type PointerEvent } from 'react';
export function ArenaArt({kind='duel'}:{kind?:'duel'|'bracket'|'ranking'|'agents'|'connect'}) {
 const id=useId().replaceAll(':','');
 if(kind==='duel')return <DuelArtwork/>;
 return <div className={'app-hero-art vector-art art-'+kind} aria-hidden="true"><svg viewBox="0 0 400 260" fill="none">
  <defs><linearGradient id={id} x1="70" y1="30" x2="340" y2="240" gradientUnits="userSpaceOnUse"><stop stopColor="#89e7d0"/><stop offset=".5" stopColor="#a7a0ff"/><stop offset="1" stopColor="#f2b37b"/></linearGradient></defs>
  <ellipse cx="200" cy="150" rx="150" ry="80" stroke={'url(#'+id+')'} strokeOpacity=".16"/><ellipse cx="200" cy="150" rx="120" ry="105" stroke={'url(#'+id+')'} strokeOpacity=".12"/>
  {kind==='bracket'?<g stroke={'url(#'+id+')'} strokeWidth="2"><path d="M50 70H110V120H155M50 170H110V120M350 70H290V120H245M350 170H290V120"/><rect x="155" y="90" width="90" height="70" rx="16" fill="#181d36"/><path d="M180 110H220L214 132L200 140L186 132Z M200 140V150 M189 150H211"/><rect x="30" y="55" width="50" height="30" rx="8" fill="#152c32"/><rect x="30" y="155" width="50" height="30" rx="8" fill="#152c32"/><rect x="320" y="55" width="50" height="30" rx="8" fill="#302137"/><rect x="320" y="155" width="50" height="30" rx="8" fill="#302137"/></g>:
  kind==='ranking'?<g stroke={'url(#'+id+')'} strokeWidth="2"><path d="M85 215V160H155V120H245V175H315V215" fill="#a7a0ff0b"/><path d="M200 38L212 65L241 68L219 88L225 117L200 102L175 117L181 88L159 68L188 65Z" fill="#f2b37b18"/><path d="M136 66Q95 105 141 142 M264 66Q305 105 259 142 M121 85L136 88 M115 106L132 106 M123 127L138 122 M279 85L264 88 M285 106L268 106 M277 127L262 122"/><path d="M155 215H245M200 145V200" opacity=".35"/></g>:
  kind==='connect'?<g stroke={'url(#'+id+')'} strokeWidth="2"><path d="M95 125H155M245 125H305" strokeDasharray="5 7"/><rect x="155" y="80" width="90" height="90" rx="24" fill="#a7a0ff12"/><rect x="183" y="120" width="34" height="28" rx="6"/><path d="M189 120V112A11 11 0 0 1 211 112V120"/><rect x="45" y="95" width="50" height="60" rx="12" fill="#89e7d012"/><rect x="305" y="95" width="50" height="60" rx="12" fill="#f2b37b12"/><path d="M60 115L70 125L60 135 M325 115L335 125L325 135"/></g>:
  <g stroke={'url(#'+id+')'} strokeWidth="1.5"><rect x="63" y="70" width="102" height="136" rx="16" transform="rotate(-12 63 70)" fill="#89e7d00c"/><rect x="244" y="50" width="102" height="136" rx="16" transform="rotate(12 244 50)" fill="#f2b37b0c"/><rect x="143" y="58" width="114" height="150" rx="18" fill="#17252e"/><path d="M176 100Q200 77 224 100L219 126L200 138L181 126Z" fill="#a7a0ff15"/><path d="M182 111H191M209 111H218M166 163H234M178 177H222"/><circle cx="200" cy="227" r="3" fill="#89e7d0"/></g>}
 </svg></div>;
}

function DuelArtwork() {
 const [paused,setPaused]=useState(false);
 const scene=useRef<HTMLDivElement>(null);
 function reset(){scene.current?.style.setProperty('--look-x','0deg');scene.current?.style.setProperty('--look-y','0deg');}
 function move(event:PointerEvent<HTMLDivElement>) {
  if(paused || event.pointerType!=='mouse' || matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const bounds=event.currentTarget.getBoundingClientRect();
  scene.current?.style.setProperty('--look-x',((event.clientX-bounds.left)/bounds.width-.5)*5+'deg');
  scene.current?.style.setProperty('--look-y',-((event.clientY-bounds.top)/bounds.height-.5)*4+'deg');
 }
 return <div className="app-hero-art duel-art sentinel-art" data-paused={paused} onPointerMove={move} onPointerLeave={reset} role="group" aria-label="Robot contenders artwork">
  <div ref={scene} className="sentinel-scene" aria-hidden="true">{['cyan','violet'].map(side=><div key={side} className={'sentinel sentinel-'+side}><img src="/art/agora-app-sentinels.png" alt="" width="1774" height="887"/></div>)}</div>
  <button type="button" className="sentinel-motion" aria-pressed={paused} onClick={()=>{setPaused(!paused);reset();}}>{paused?'Resume motion':'Pause motion'}</button>
 </div>;
}
