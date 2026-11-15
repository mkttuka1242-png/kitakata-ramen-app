// 表示専用。診断の訪問日時・訪問記録・計測イベントには触れない。
(() => {
  const jstOffset = 9 * 60 * 60 * 1000;
  let note = null;
  let timer = null;
  let generation = 0;
  let revision = 0;
  let resume = null;

  function unmount() {
    generation++;
    revision++;
    if (timer !== null) clearTimeout(timer);
    timer = null;
    if (resume) {
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('pageshow', resume);
      window.removeEventListener('focus', resume);
    }
    resume = null;
    note = null;
  }

  function refresh() {
    revision++;
    if (timer !== null) clearTimeout(timer);
    timer = null;
    if (!note?.isConnected) { unmount(); return; }

    const now = Date.now();
    const japan = new Date(now + jstOffset);
    const year = japan.getUTCFullYear();
    const month = japan.getUTCMonth();
    const day = japan.getUTCDate();
    const beforeFour = japan.getUTCHours() < 4;
    note.textContent = beforeFour ? `本日${month + 1}月${day}日 明け方` : '';
    note.hidden = !beforeFour;

    const next = beforeFour
      ? Date.UTC(year, month, day, 4) - jstOffset
      : Date.UTC(year, month, day + 1) - jstOffset;
    const current = generation;
    const scheduled = revision;
    timer = setTimeout(() => {
      if (current === generation && scheduled === revision) refresh();
    }, Math.max(1, next - now));
  }

  window.ramenDawnNote = {
    mount(element) {
      unmount();
      if (!element?.isConnected) return;
      note = element;
      const current = generation;
      // 解除前に実行待ちになったイベントも、新しい表示には作用させない。
      resume = () => { if (current === generation) refresh(); };
      document.addEventListener('visibilitychange', resume);
      window.addEventListener('pageshow', resume);
      window.addEventListener('focus', resume);
      refresh();
    },
    unmount,
  };
})();
