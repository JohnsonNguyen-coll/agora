import { useEffect, type RefObject } from 'react';
export function useLandingMotion(root: RefObject<HTMLDivElement>, paused: boolean) {
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    const update = () => {
      frame = 0;
      const reduced = paused || preference.matches;
      element.dataset.motion = reduced ? 'paused' : 'active';
      const range = document.documentElement.scrollHeight - innerHeight;
      element.style.setProperty('--page-progress', String(range > 0 ? scrollY / range : 0));
      element.style.setProperty('--hero-drift', reduced ? '0px' : Math.min(scrollY * .13, 100) + 'px');
      element.querySelectorAll<HTMLElement>('[data-scroll-scene]').forEach(scene => {
        const bounds = scene.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, (innerHeight - bounds.top) / (innerHeight + bounds.height)));
        scene.style.setProperty('--scene-progress', reduced ? '0.5' : String(progress));
      });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      entry.target.classList.toggle('in-view', entry.isIntersecting);
    }), { rootMargin: '60px' });
    element.querySelectorAll('[data-scroll-scene]').forEach(scene => observer.observe(scene));
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule);
    preference.addEventListener('change', schedule);
    update();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); removeEventListener('scroll', schedule);
      removeEventListener('resize', schedule); preference.removeEventListener('change', schedule); };
  }, [root, paused]);
}
