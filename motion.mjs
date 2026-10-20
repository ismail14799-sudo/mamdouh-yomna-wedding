const SEEN_KEY = 'mamdouh-yomna-intro-v3';

export function initWeddingMotion(doc, win) {
  const root = doc.documentElement;
  const dialog = doc.getElementById('welcome-dialog');
  const openButton = doc.getElementById('open-invitation');
  const skipButton = doc.getElementById('skip-intro');
  const replayButton = doc.getElementById('replay-intro');
  const note = doc.getElementById('welcome-note');
  const heading = doc.getElementById('couple-names');
  const welcomeTitle = doc.getElementById('welcome-title');
  if (!dialog || !openButton || !skipButton || root.dataset.weddingMotionInitialized) return;
  root.dataset.weddingMotionInitialized = 'true';

  const preference = win.matchMedia?.('(prefers-reduced-motion: reduce)') || {matches: false};
  const timers = new Set();
  let phase = 'closed';
  let observer;

  const schedule = (callback, delay) => {
    const id = win.setTimeout(() => { timers.delete(id); callback(); }, delay);
    timers.add(id);
  };
  const clearTimers = () => { for (const id of timers) win.clearTimeout(id); timers.clear(); };
  const wasSeen = () => { try { return win.sessionStorage.getItem(SEEN_KEY) === 'true'; } catch { return false; } };
  const remember = () => { try { win.sessionStorage.setItem(SEEN_KEY, 'true'); } catch { /* Private browsing can disable storage. */ } };

  for (const [index, line] of [...doc.querySelectorAll('.hero-copy > *, .hero-details')].entries()) {
    line.classList.add('hero-entry');
    line.style.setProperty('--entry-delay', `${180 + index * 95}ms`);
  }

  function setupReveals() {
    observer?.disconnect();
    const items = doc.querySelectorAll('[data-reveal]');
    if (preference.matches || !win.IntersectionObserver) {
      root.classList.remove('reveal-enabled');
      for (const item of items) item.classList.add('is-revealed');
      return;
    }
    try {
      observer = new win.IntersectionObserver(entries => {
        for (const entry of entries) if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      }, {threshold: 0.12, rootMargin: '0px 0px -28px 0px'});
      root.classList.add('reveal-enabled');
      for (const item of items) observer.observe(item);
    } catch {
      root.classList.remove('reveal-enabled');
    }
  }

  function finishIntro(skipped = false) {
    const hadDialog = phase !== 'closed' || dialog.open;
    phase = 'closed';
    clearTimers();
    root.classList.remove('intro-active');
    doc.body.classList.remove('intro-active');
    root.classList.toggle('intro-skipped', skipped);
    root.classList.add('intro-finished');
    dialog.classList.remove('is-opening', 'is-leaving');
    dialog.removeAttribute('aria-busy');
    openButton.disabled = false;
    remember();
    if (dialog.open) dialog.close();
    if (hadDialog) {
      try { win.scrollTo({top: 0, behavior: 'instant'}); } catch { win.scrollTo(0, 0); }
      heading?.focus({preventScroll: true});
    }
  }

  function showIntro() {
    if (preference.matches || typeof dialog.showModal !== 'function') { finishIntro(true); return; }
    if (phase !== 'closed') return;
    clearTimers();
    dialog.classList.remove('is-opening', 'is-leaving');
    dialog.removeAttribute('aria-busy');
    openButton.disabled = false;
    note.textContent = 'اضغط على الختم لفتح دعوتنا';
    try {
      dialog.showModal();
      phase = 'sealed';
      root.classList.remove('intro-finished', 'intro-skipped');
      root.classList.add('intro-active');
      doc.body.classList.add('intro-active');
      (welcomeTitle || openButton).focus({preventScroll: true});
    } catch { finishIntro(true); }
  }

  openButton.addEventListener('click', () => {
    if (phase !== 'sealed') return;
    phase = 'opening';
    openButton.disabled = true;
    dialog.setAttribute('aria-busy', 'true');
    dialog.classList.add('is-opening');
    note.textContent = 'أهلًا بكم في فرحتنا';
    schedule(() => { phase = 'leaving'; dialog.classList.add('is-leaving'); }, 2200);
    schedule(() => finishIntro(false), 2700);
  });
  skipButton.addEventListener('click', () => finishIntro(true));
  dialog.addEventListener('cancel', event => { event.preventDefault(); finishIntro(true); });
  dialog.addEventListener('close', () => { if (phase !== 'closed') finishIntro(true); });
  replayButton?.addEventListener('click', showIntro);

  function applyPreference() {
    if (replayButton) replayButton.hidden = preference.matches;
    if (preference.matches) {
      finishIntro(true);
      root.classList.remove('motion-ready', 'reveal-enabled');
      observer?.disconnect();
    } else {
      root.classList.add('motion-ready');
    }
    setupReveals();
  }
  if (typeof preference.addEventListener === 'function') preference.addEventListener('change', applyPreference);
  else preference.addListener?.(applyPreference);

  applyPreference();
  if (!preference.matches && !wasSeen() && !win.location.hash) showIntro();
  else finishIntro(true);

  return {showIntro, finishIntro};
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  try { initWeddingMotion(document, window); }
  catch (error) {
    document.documentElement.classList.remove('motion-ready', 'intro-active', 'reveal-enabled');
    document.body.classList.remove('intro-active');
    const dialog = document.getElementById('welcome-dialog');
    if (dialog?.open) dialog.close();
    console.error('Invitation motion could not start; the invitation remains available.', error);
  }
}
