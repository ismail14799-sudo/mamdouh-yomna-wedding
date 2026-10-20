const PREFERENCE_KEY = 'mamdouh-yomna-music';

export function initWeddingMusic(doc, win) {
  const audio = doc.getElementById('wedding-music');
  const buttons = [...doc.querySelectorAll('[data-music-toggle]')];
  const status = doc.getElementById('music-status');
  if (!audio || !buttons.length || typeof audio.play !== 'function' || audio.dataset.initialized) return;
  audio.dataset.initialized = 'true';
  let mutedByGuest = false;
  try { mutedByGuest = win.localStorage.getItem(PREFERENCE_KEY) === 'off'; } catch { /* Optional preference only. */ }
  let requested = false, playing = false, pending = false, generation = 0;
  // The local recording is mastered quietly so iOS hardware-volume behavior is also comfortable.
  audio.volume = 0.85;
  const announce = message => { if (status) status.textContent = message; };
  const remember = value => { try { win.localStorage.setItem(PREFERENCE_KEY, value); } catch { /* Storage is optional. */ } };
  function sync() {
    for (const button of buttons) {
      button.hidden = false;
      button.classList.toggle('is-playing', playing);
      button.setAttribute('aria-pressed', String(playing));
      button.setAttribute('aria-busy', String(pending));
      const label = requested ? 'إيقاف الموسيقى' : 'تشغيل الموسيقى';
      button.setAttribute('aria-label', label);
      const text = button.querySelector('[data-music-label]');
      if (text) text.textContent = label;
    }
  }
  function pause(rememberChoice = false) {
    generation++;
    requested = playing = pending = false;
    audio.pause();
    if (rememberChoice) { mutedByGuest = true; remember('off'); }
    sync();
    announce('الموسيقى متوقفة');
  }
  function failed(attempt) {
    if (attempt !== generation) return;
    requested = playing = pending = false;
    sync();
    announce('تعذّر تشغيل الموسيقى. يمكنك المحاولة من زر الموسيقى.');
  }
  function play() {
    if (pending || (requested && !audio.paused)) return;
    const attempt = ++generation;
    requested = pending = true;
    sync();
    announce('جارٍ تشغيل الموسيقى');
    try {
      // Call play inside the original click, before any promise or animation timer.
      const result = audio.play();
      Promise.resolve(result).then(() => {
        if (attempt !== generation) { if (!requested) audio.pause(); return; }
        pending = false;
        playing = !audio.paused;
        if (!playing) requested = false;
        sync();
        announce(playing ? 'الموسيقى تعمل' : 'الموسيقى متوقفة');
      }).catch(() => failed(attempt));
    } catch { failed(attempt); }
  }
  for (const button of buttons) button.addEventListener('click', () => {
    if (requested || playing || pending) pause(true);
    else { mutedByGuest = false; remember('on'); play(); }
  });
  doc.getElementById('open-invitation')?.addEventListener('click', () => {
    if (!mutedByGuest) play();
  });
  audio.addEventListener('playing', () => {
    if (!requested) { audio.pause(); return; }
    pending = false; playing = true; sync();
  });
  audio.addEventListener('pause', () => {
    if (!audio.paused) return; // Ignore a queued pause event after a newer play request.
    generation++;
    requested = playing = pending = false;
    sync();
  });
  audio.addEventListener('error', () => { generation++; failed(generation); });
  doc.addEventListener('visibilitychange', () => { if (doc.visibilityState === 'hidden') pause(); });
  win.addEventListener('pagehide', () => pause());
  doc.documentElement.classList.add('has-music');
  sync();
  return {play, pause};
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  try { initWeddingMusic(document, window); }
  catch (error) { console.error('Music is unavailable; the invitation remains available.', error); }
}
