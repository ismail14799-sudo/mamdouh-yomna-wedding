export function countdownParts(target, now = Date.now()) {
  const targetMs = typeof target === 'number' ? target : Date.parse(target);
  if (!Number.isFinite(targetMs) || !Number.isFinite(now)) return null;
  const remaining = Math.max(0, Math.ceil((targetMs - now) / 1000));
  return {
    days: Math.floor(remaining / 86400),
    hours: Math.floor(remaining / 3600) % 24,
    minutes: Math.floor(remaining / 60) % 60,
    seconds: remaining % 60,
    started: targetMs <= now
  };
}

export function invitationUrl(href) {
  const url = new URL(href);
  url.search = '';
  url.hash = '';
  return url.href;
}

if (typeof document !== 'undefined') {
  const target = document.body.dataset.eventStart;
  const timer = document.querySelector('#countdown');
  const note = document.querySelector('#countdown-note');
  const formatter = new Intl.NumberFormat('ar-EG', {minimumIntegerDigits: 2, useGrouping: false});
  const dayFormatter = new Intl.NumberFormat('ar-EG', {useGrouping: false});
  let interval;

  function updateCountdown() {
    const parts = countdownParts(target);
    if (!parts) {
      timer.hidden = true;
      return;
    }
    for (const key of ['days', 'hours', 'minutes', 'seconds']) {
      document.getElementById(key).textContent = (key === 'days' ? dayFormatter : formatter).format(parts[key]);
    }
    if (parts.started) {
      document.querySelector('#countdown-title').textContent = 'حلّ موعد فرحتنا';
      note.textContent = 'بارك الله لنا وجمع بيننا في خير. دامت دياركم عامرة بالأفراح.';
      if (interval) clearInterval(interval);
      return false;
    }
    return true;
  }

  if (updateCountdown()) interval = setInterval(updateCountdown, 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) updateCountdown();
  });

  const shareButton = document.querySelector('#share-invitation');
  const dialog = document.querySelector('#share-dialog');
  const shareInput = document.querySelector('#share-url');
  const copyButton = document.querySelector('#copy-link');
  const toast = document.querySelector('#toast');
  const url = invitationUrl(window.location.href);
  let toastTimeout;

  function announce(message) {
    clearTimeout(toastTimeout);
    toast.textContent = message;
    toast.classList.add('visible');
    toastTimeout = setTimeout(() => toast.classList.remove('visible'), 4000);
  }

  function showShareDialog() {
    shareInput.value = url;
    document.querySelector('#copy-hint').hidden = true;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    shareInput.focus();
    shareInput.select();
  }

  shareButton.addEventListener('click', async () => {
    const groom = document.querySelector('#groom-name').textContent;
    const bride = document.querySelector('#bride-name').textContent;
    const title = `دعوة زفاف ${groom} و${bride}`;
    const text = 'تكتمل فرحتنا بحضوركم. الأحد ٦ ديسمبر ٢٠٢٦، الساعة الثامنة مساءً، قاعة جراند بلازا — طلخا.';
    if (navigator.share) {
      try {
        await navigator.share({title, text, url});
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    }
    showShareDialog();
  });

  document.querySelector('#close-share').addEventListener('click', () => {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  });

  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });

  copyButton.addEventListener('click', async () => {
    shareInput.focus();
    shareInput.select();
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(url);
      announce('تم نسخ رابط الدعوة');
    } catch {
      document.querySelector('#copy-hint').hidden = false;
      announce('يمكنك نسخ الرابط المحدد من الحقل');
    }
  });
}
