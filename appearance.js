/* Appearance stays separate from question selection, grading and study progress. */
(() => {
  'use strict';
  const html = document.documentElement;
  const toggle = document.getElementById('themeToggle');
  const preference = matchMedia('(prefers-color-scheme: light)');
  let saved = null;
  try { saved = localStorage.getItem('ppiq_theme'); } catch (_) { /* Optional persistence. */ }
  if (!['light', 'dark'].includes(saved)) saved = null;
  function apply(theme) {
    html.dataset.theme = theme;
    const dark = theme === 'dark';
    document.getElementById('themeLabel').textContent = dark ? 'Light mode' : 'Dark mode';
    toggle.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} mode`);
    toggle.setAttribute('aria-pressed', String(dark));
    document.querySelector('meta[name="theme-color"]').content = dark ? '#191b18' : '#f3efe7';
  }
  apply(saved || (preference.matches ? 'light' : 'dark'));
  toggle.addEventListener('click', () => {
    saved = html.dataset.theme === 'dark' ? 'light' : 'dark';
    apply(saved);
    try { localStorage.setItem('ppiq_theme', saved); } catch (_) { /* Theme still works for this visit. */ }
  });
  preference.addEventListener('change', () => { if (!saved) apply(preference.matches ? 'light' : 'dark'); });

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  let frame = 0;
  document.addEventListener('pointermove', event => {
    if (motion.matches || !pointer.matches) return;
    const scene = event.target.closest('.depth-scene');
    if (!scene) return;
    const bounds = scene.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - .5;
    const y = (event.clientY - bounds.top) / bounds.height - .5;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      scene.style.setProperty('--rx', `${-y * 10}deg`);
      scene.style.setProperty('--ry', `${x * 12}deg`);
    });
  });
  document.addEventListener('pointerout', event => {
    const scene = event.target.closest('.depth-scene');
    if (!scene || (event.relatedTarget instanceof Node && scene.contains(event.relatedTarget))) return;
    cancelAnimationFrame(frame);
    scene.style.removeProperty('--rx');
    scene.style.removeProperty('--ry');
  });
})();
