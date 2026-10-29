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
  Object.defineProperty(performance, 'now', {configurable:true, value:now});
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
    tasks.set(id, task); if (!paused) arm(id, task); return id;
  }
  window.setTimeout = (fn, ms, ...args) => schedule(fn, ms, false, args);
  window.setInterval = (fn, ms, ...args) => schedule(fn, ms, true, args);
  window.clearTimeout = window.clearInterval = id => {
    const task = tasks.get(id); if (task) { native.clear(task.native); tasks.delete(id); }
  };
  function armFrame(id, fn) {
    const handle = native.raf(() => { frames.delete(id); fn(now()); });
    frames.set(id, {fn, handle});
  }
  window.requestAnimationFrame = fn => { const id = ++sequence; if (paused) frames.set(id, {fn}); else armFrame(id, fn); return id; };
  window.cancelAnimationFrame = id => { const frame = frames.get(id); if (frame) native.caf(frame.handle); frames.delete(id); };
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
      for (const task of tasks.values()) { task.remaining = Math.max(0, task.remaining - (pausedAt-task.started)); native.clear(task.native); }
      for (const frame of frames.values()) native.caf(frame.handle);
      for (const media of playing) if (!media.paused) { resumeMedia.add(this); media.pause(); }
      if (window.speechSynthesis?.speaking && !speechSynthesis.paused) { window.MonstudyMaterial.resumeSpeech=true; speechSynthesis.pause(); }
    } else {
      excluded += native.now()-pausedAt; paused = false;
      for (const [id, task] of tasks) arm(id, task);
      for (const [id, frame] of frames) armFrame(id, frame.fn);
      for (const media of resumeMedia) void play.call(media).catch(()=>{});
      resumeMedia.clear();
      if (window.MonstudyMaterial.resumeSpeech) { speechSynthesis.resume(); window.MonstudyMaterial.resumeSpeech=false; }
    }
    document.documentElement.classList.toggle('monstudy-paused', paused);
    document.dispatchEvent(new CustomEvent('monstudy:pause', {detail:{paused}}));
  }
  window.MonstudyMaterial = {
    setPaused, get paused() { return paused; },
    setActivityGuard(fn) { guard = fn; },
    isActive() { try { return guard ? Boolean(guard()) : false; } catch { return true; } }
  };

  function installPetRoomFurnitureOverlay() {
    if (!/\/pet-room\/v4\.html$/.test(here.pathname)) return;
    const room = document.getElementById('room');
    const sofa = document.getElementById('sofaActor');
    const sofaImg = document.getElementById('sofaImage');
    const sofaButton = document.getElementById('sofaButton');
    const legacyPanel = document.getElementById('placementPanel');
    const legacyConfirm = document.getElementById('confirmFurniture');
    const legacyCancel = document.getElementById('cancelFurniture');
    if (!room || !sofa || !sofaButton || !legacyPanel || !legacyConfirm || !legacyCancel) return;

    const style = document.createElement('style');
    style.id = 'pet-room-furniture-overlay-style';
    style.textContent = `
      #placementPanel{display:none!important}
      #sofaActor{width:clamp(88px,20%,170px)!important;pointer-events:auto!important;cursor:pointer!important;transform:translate(-50%,-88%)!important;transform-origin:50% 88%!important;transition:left .18s ease,top .18s ease,transform .18s ease,filter .18s ease!important;filter:drop-shadow(0 5px 5px rgba(91,61,41,.18))!important}
      #sofaActor img{filter:saturate(.84) contrast(.88) brightness(1.075)!important}
      #room.placing #sofaActor{transform:translate(-50%,-105%) scale(1.025)!important;filter:drop-shadow(0 13px 11px rgba(91,61,41,.25))!important}
      #room.placing #sofaActor::after{content:'';position:absolute;left:14%;right:14%;bottom:4%;height:12%;border-radius:50%;background:rgba(108,76,50,.13);filter:blur(5px);transform:translateY(115%);pointer-events:none}
      #roomFurnitureHud{position:absolute;z-index:1400;width:132px;padding:8px;border:1px solid rgba(117,105,96,.16);border-radius:18px;background:rgba(255,252,248,.95);box-shadow:0 10px 28px rgba(78,58,43,.18);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);transform:translateY(-50%);transition:left .16s ease,top .16s ease;touch-action:manipulation}
      #roomFurnitureHud[hidden]{display:none!important}
      #roomFurnitureHud .iso-pad{display:grid;grid-template-columns:38px 38px 38px;grid-template-rows:38px 38px 38px;gap:1px;justify-content:center;align-items:center}
      #roomFurnitureHud .iso-key{appearance:none;border:1px solid #d9ded9;background:#fff;color:#356b57;border-radius:12px;font-size:22px;font-weight:900;line-height:1;box-shadow:0 2px 6px rgba(62,82,72,.08);touch-action:manipulation}
      #roomFurnitureHud .iso-key:active:not(:disabled){transform:scale(.92);background:#edf7f0}
      #roomFurnitureHud .iso-key:disabled{opacity:.27}
      #roomFurnitureHud .ul{grid-column:1;grid-row:1}.ur{grid-column:3;grid-row:1}.dl{grid-column:1;grid-row:3}.dr{grid-column:3;grid-row:3}
      #roomFurnitureHud .hud-center{grid-column:2;grid-row:2;display:grid;place-items:center;width:30px;height:30px;margin:auto;border-radius:50%;background:#f6eee8;font-size:15px}
      #roomFurnitureHud .hud-actions{display:flex;gap:6px;margin-top:5px}
      #roomFurnitureHud .hud-action{appearance:none;flex:1;min-height:32px;border-radius:10px;border:1px solid #d8dfda;background:#fff;font-size:12px;font-weight:850;color:#5d5753;touch-action:manipulation}
      #roomFurnitureHud .ok{background:#39745b;border-color:#39745b;color:#fff}
      @media(max-width:700px){#sofaActor{width:clamp(86px,24%,126px)!important}#roomFurnitureHud{width:122px;padding:7px}#roomFurnitureHud .iso-pad{grid-template-columns:35px 35px 35px;grid-template-rows:35px 35px 35px}#roomFurnitureHud .iso-key{font-size:20px}}
    `;
    document.head.append(style);

    const hud = document.createElement('div');
    hud.id = 'roomFurnitureHud';
    hud.hidden = true;
    hud.innerHTML = `
      <div class="iso-pad" role="group" aria-label="ソファを斜め方向へ1マスずつ移動">
        <button class="iso-key ul" type="button" data-iso="ul" aria-label="左奥へ1マス">↖</button>
        <button class="iso-key ur" type="button" data-iso="ur" aria-label="右奥へ1マス">↗</button>
        <div class="hud-center" aria-hidden="true">🛋️</div>
        <button class="iso-key dl" type="button" data-iso="dl" aria-label="左手前へ1マス">↙</button>
        <button class="iso-key dr" type="button" data-iso="dr" aria-label="右手前へ1マス">↘</button>
      </div>
      <div class="hud-actions"><button class="hud-action" type="button" data-hud="cancel">× 戻す</button><button class="hud-action ok" type="button" data-hud="ok">✓ 決定</button></div>`;
    room.append(hud);

    const legacyMoves = {
      ul: legacyPanel.querySelector('[data-move="left"]'),
      ur: legacyPanel.querySelector('[data-move="up"]'),
      dl: legacyPanel.querySelector('[data-move="down"]'),
      dr: legacyPanel.querySelector('[data-move="right"]')
    };
    const isEditing = () => room.classList.contains('placing') || !legacyPanel.hidden || window.MonStudyFurnitureEditing === true;

    function positionHud() {
      if (hud.hidden) return;
      const rr = room.getBoundingClientRect();
      const sr = sofa.getBoundingClientRect();
      const hw = hud.offsetWidth || 122, hh = hud.offsetHeight || 150;
      let x = sr.right - rr.left + 9;
      let y = sr.top - rr.top + sr.height * .52;
      if (x + hw > rr.width - 8) x = sr.left - rr.left - hw - 9;
      x = Math.max(8, Math.min(rr.width - hw - 8, x));
      y = Math.max(hh * .5 + 8, Math.min(rr.height - hh * .5 - 8, y));
      hud.style.left = `${x}px`;
      hud.style.top = `${y}px`;
    }
    function syncDisabled() {
      for (const [dir, oldButton] of Object.entries(legacyMoves)) {
        const button = hud.querySelector(`[data-iso="${dir}"]`);
        if (button) button.disabled = !oldButton || oldButton.disabled;
      }
    }
    function syncHud() {
      const editing = isEditing();
      hud.hidden = !editing;
      sofa.setAttribute('aria-selected', String(editing));
      if (editing) {
        requestAnimationFrame(() => { syncDisabled(); positionHud(); });
      }
    }

    sofa.addEventListener('click', event => {
      if (sofa.hidden) return;
      event.preventDefault(); event.stopPropagation();
      if (!isEditing()) sofaButton.click();
      native.timeout(syncHud, 0);
    });
    hud.addEventListener('click', event => {
      const iso = event.target.closest('[data-iso]');
      if (iso) {
        const oldButton = legacyMoves[iso.dataset.iso];
        if (oldButton && !oldButton.disabled) oldButton.click();
        native.timeout(() => { syncDisabled(); positionHud(); }, 0);
        return;
      }
      const action = event.target.closest('[data-hud]')?.dataset.hud;
      if (action === 'ok') legacyConfirm.click();
      if (action === 'cancel') legacyCancel.click();
      native.timeout(syncHud, 0);
    });
    sofaButton.addEventListener('click', () => native.timeout(syncHud, 0));
    legacyConfirm.addEventListener('click', () => native.timeout(syncHud, 0));
    legacyCancel.addEventListener('click', () => native.timeout(syncHud, 0));
    new MutationObserver(syncHud).observe(room, {attributes:true, attributeFilter:['class']});
    new MutationObserver(syncHud).observe(legacyPanel, {attributes:true, attributeFilter:['hidden']});
    new MutationObserver(() => { if (!hud.hidden) native.timeout(positionHud, 0); }).observe(sofa, {attributes:true, attributeFilter:['style','hidden']});
    window.addEventListener('resize', positionHud, {passive:true});
    if (sofaImg) sofaImg.setAttribute('draggable','false');
    syncHud();
  }

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.hasAttribute('download')) return;
    const url = new URL(link.href);
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
    if (parent.MonstudyShell.canOpen(url)) { event.preventDefault(); parent.MonstudyShell.navigate(url); }
  }, true);
  document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = '.monstudy-paused *{animation-play-state:paused!important}'; document.head.append(style);
    installPetRoomFurnitureOverlay();
    parent.MonstudyShell.materialReady(window);
  }, {once:true});
})();
