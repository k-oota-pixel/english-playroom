/* Shared, synchronous entry point: loaded before each material's scripts. */
(() => {
  if (window.MonstudyMaterial) return;
  const script = document.currentScript;
  const home = new URL('./', script.src);
  const here = new URL(location.href);
  let hosted = false;
  try { hosted = parent !== window && parent.MonstudyShell?.owns(window); } catch {}
  if (!hosted) {
    const target = new URL(home);
    const material = /\/pet-room\/v4\.html$/.test(here.pathname)
      ? new URL('./', here).pathname + here.search + here.hash
      : here.pathname + here.search + here.hash;
    target.searchParams.set('material', material);
    location.replace(target.href);
    return;
  }
  if (/\/pet-room\/(?:index\.html)?$/.test(here.pathname)) {
    const target = new URL('v4.html', here);
    target.search = here.search;
    target.hash = here.hash;
    location.replace(target.href);
    return;
  }

  const native = {
    timeout: window.setTimeout.bind(window), clear: window.clearTimeout.bind(window),
    raf: window.requestAnimationFrame.bind(window), caf: window.cancelAnimationFrame.bind(window),
    now: performance.now.bind(performance)
  };
  let paused = false, pausedAt = 0, excluded = 0, sequence = 0, guard = null;
  const tasks = new Map(), frames = new Map(), playing = new Set(), resumeMedia = new Set();
  const now = () => (paused ? pausedAt : native.now()) - excluded;
  try { Object.defineProperty(performance, 'now', {configurable:true, value:now}); } catch {}

  function arm(id, task) {
    task.started = native.now();
    task.native = native.timeout(() => {
      if (!tasks.has(id)) return;
      if (task.interval == null) tasks.delete(id);
      else { task.remaining = task.interval; arm(id, task); }
      if (typeof task.fn === 'function') task.fn(...task.args);
      else (0, eval)(String(task.fn));
    }, task.remaining);
  }
  function schedule(fn, delay, interval, args) {
    const id = ++sequence, remaining = Math.max(0, Number(delay) || 0);
    const task = {fn, args, remaining, interval:interval ? Math.max(1, remaining) : null};
    tasks.set(id, task);
    if (!paused) arm(id, task);
    return id;
  }
  window.setTimeout = (fn, ms, ...args) => schedule(fn, ms, false, args);
  window.setInterval = (fn, ms, ...args) => schedule(fn, ms, true, args);
  window.clearTimeout = window.clearInterval = id => {
    const task = tasks.get(id);
    if (task) { native.clear(task.native); tasks.delete(id); }
  };
  function armFrame(id, fn) {
    const handle = native.raf(() => { frames.delete(id); fn(now()); });
    frames.set(id, {fn, handle});
  }
  window.requestAnimationFrame = fn => {
    const id = ++sequence;
    if (paused) frames.set(id, {fn}); else armFrame(id, fn);
    return id;
  };
  window.cancelAnimationFrame = id => {
    const frame = frames.get(id);
    if (frame?.handle) native.caf(frame.handle);
    frames.delete(id);
  };

  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function(...args) {
    playing.add(this);
    if (paused) { resumeMedia.add(this); return Promise.resolve(); }
    return play.apply(this, args);
  };

  function setPaused(value) {
    if (paused === value) return;
    if (value) {
      pausedAt = native.now(); paused = true;
      for (const task of tasks.values()) {
        task.remaining = Math.max(0, task.remaining - (pausedAt-task.started));
        native.clear(task.native);
      }
      for (const frame of frames.values()) if (frame.handle) native.caf(frame.handle);
      for (const media of playing) if (!media.paused) { resumeMedia.add(media); media.pause(); }
      if (window.speechSynthesis?.speaking && !speechSynthesis.paused) {
        window.MonstudyMaterial.resumeSpeech = true; speechSynthesis.pause();
      }
    } else {
      excluded += native.now() - pausedAt; paused = false;
      for (const [id, task] of tasks) arm(id, task);
      for (const [id, frame] of frames) armFrame(id, frame.fn);
      for (const media of resumeMedia) void play.call(media).catch(()=>{});
      resumeMedia.clear();
      if (window.MonstudyMaterial.resumeSpeech) {
        speechSynthesis.resume(); window.MonstudyMaterial.resumeSpeech = false;
      }
    }
    document.documentElement.classList.toggle('monstudy-paused', paused);
    document.dispatchEvent(new CustomEvent('monstudy:pause', {detail:{paused}}));
  }

  window.MonstudyMaterial = {
    setPaused,
    get paused() { return paused; },
    setActivityGuard(fn) { guard = fn; },
    isActive() { try { return guard ? Boolean(guard()) : false; } catch { return true; } }
  };

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.hasAttribute('download')) return;
    const url = new URL(link.href);
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
    if (parent.MonstudyShell.canOpen(url)) {
      event.preventDefault(); parent.MonstudyShell.navigate(url);
    }
  }, true);

  document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = '.monstudy-paused *{animation-play-state:paused!important}';
    document.head.append(style);
    if (/\/pet-room\/v4\.html$/.test(here.pathname)) {
      const s = document.createElement('script');
      s.src = new URL('pet-room/sofa-v2.js?v=3', home).href;
      s.defer = true;
      document.head.append(s);
    }
    parent.MonstudyShell.materialReady(window);
  }, {once:true});
})();
