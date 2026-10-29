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
      for (const media of playing) if (!media.paused) { resumeMedia.add(media); media.pause(); }
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
    const grid = window.MonStudyRoomGrid?.grid;
    const occupied = window.MonStudyRoomOccupied;
    if (!room || !sofa || !sofaButton || !legacyPanel || !legacyConfirm || !legacyCancel || !grid || !occupied) return;

    const ROTATION_KEY = 'monstudy-pet-room-sofa-rotation-v1';
    const STORE_KEY = 'monstudy-pet-room-sofa-v1';
    let rotated = localStorage.getItem(ROTATION_KEY) === '1';
    let editBackup = null;

    const style = document.createElement('style');
    style.id = 'pet-room-furniture-overlay-style';
    style.textContent = `
      #placementPanel{display:none!important}
      #sofaActor{width:clamp(88px,20%,170px)!important;pointer-events:auto!important;cursor:pointer!important;transform:translate(-50%,-64%)!important;transform-origin:50% 88%!important;transition:left .18s ease,top .18s ease,transform .18s ease,filter .18s ease!important;filter:drop-shadow(0 4px 4px rgba(91,61,41,.15))!important}
      #sofaActor img{filter:saturate(.84) contrast(.88) brightness(1.075)!important;transition:transform .18s ease!important}
      #sofaActor[data-rotated="true"] img{transform:scaleX(-1)!important}
      #room.placing #sofaActor{transform:translate(-50%,-80%) scale(1.025)!important;filter:drop-shadow(0 11px 9px rgba(91,61,41,.23))!important}
      #room.placing #sofaActor::after{content:'';position:absolute;left:14%;right:14%;bottom:0;height:10%;border-radius:50%;background:rgba(108,76,50,.12);filter:blur(5px);transform:translateY(85%);pointer-events:none}
      #roomFurnitureHud{position:absolute;z-index:1400;width:140px;padding:8px;border:1px solid rgba(117,105,96,.16);border-radius:18px;background:rgba(255,252,248,.95);box-shadow:0 10px 28px rgba(78,58,43,.18);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);transform:translateY(-50%);transition:left .16s ease,top .16s ease;touch-action:manipulation}
      #roomFurnitureHud[hidden]{display:none!important}
      #roomFurnitureHud .iso-pad{display:grid;grid-template-columns:38px 38px 38px;grid-template-rows:38px 38px 38px;gap:1px;justify-content:center;align-items:center}
      #roomFurnitureHud .iso-key{appearance:none;border:1px solid #d9ded9;background:#fff;color:#356b57;border-radius:12px;font-size:22px;font-weight:900;line-height:1;box-shadow:0 2px 6px rgba(62,82,72,.08);touch-action:manipulation}
      #roomFurnitureHud .iso-key:active:not(:disabled){transform:scale(.92);background:#edf7f0}
      #roomFurnitureHud .iso-key:disabled{opacity:.27}
      #roomFurnitureHud .ul{grid-column:1;grid-row:1}.ur{grid-column:3;grid-row:1}.dl{grid-column:1;grid-row:3}.dr{grid-column:3;grid-row:3}
      #roomFurnitureHud .hud-center{grid-column:2;grid-row:2;display:grid;place-items:center;width:30px;height:30px;margin:auto;border-radius:50%;background:#f6eee8;font-size:15px}
      #roomFurnitureHud .hud-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin-top:6px}
      #roomFurnitureHud .hud-action{appearance:none;min-height:32px;border-radius:10px;border:1px solid #d8dfda;background:#fff;font-size:11px;font-weight:850;color:#5d5753;touch-action:manipulation;padding:0 4px}
      #roomFurnitureHud .rotate{color:#765786;background:#fbf7ff;border-color:#e4d8eb}
      #roomFurnitureHud .ok{background:#39745b;border-color:#39745b;color:#fff}
      #roomFurnitureHud .ok:disabled{opacity:.42}
      @media(max-width:700px){#sofaActor{width:clamp(86px,24%,126px)!important}#roomFurnitureHud{width:132px;padding:7px}#roomFurnitureHud .iso-pad{grid-template-columns:35px 35px 35px;grid-template-rows:35px 35px 35px}#roomFurnitureHud .iso-key{font-size:20px}#roomFurnitureHud .hud-action{font-size:10px}}
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
      <div class="hud-actions">
        <button class="hud-action" type="button" data-hud="cancel">× 戻す</button>
        <button class="hud-action rotate" type="button" data-hud="rotate">↻ 回転</button>
        <button class="hud-action ok" type="button" data-hud="ok">✓ 決定</button>
      </div>`;
    room.append(hud);

    const legacyMoves = {
      ul: legacyPanel.querySelector('[data-move="left"]'),
      ur: legacyPanel.querySelector('[data-move="up"]'),
      dl: legacyPanel.querySelector('[data-move="down"]'),
      dr: legacyPanel.querySelector('[data-move="right"]')
    };
    const isEditing = () => room.classList.contains('placing') || !legacyPanel.hidden || window.MonStudyFurnitureEditing === true;
    const currentSofa = () => window.MonStudyRoomFurniture?.sofa || null;
    const key = (x,y) => `${x},${y}`;
    const footprint = (state, isRotated=rotated) => {
      if (!state) return [];
      return isRotated
        ? [{x:state.x,y:state.y},{x:state.x,y:state.y+1}]
        : [{x:state.x,y:state.y},{x:state.x+1,y:state.y}];
    };
    function readSaved() {
      try {
        const v = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
        return v && Number.isInteger(v.x) && Number.isInteger(v.y) ? v : null;
      } catch { return null; }
    }
    function clearBothFootprints(state) {
      if (!state) return;
      for (const c of [...footprint(state,false),...footprint(state,true)]) occupied.delete(key(c.x,c.y));
    }
    function addCurrentFootprint() {
      const s = currentSofa() || readSaved();
      if (!s?.placed) return;
      clearBothFootprints(s);
      for (const c of footprint(s,rotated)) if (c.x>=0&&c.y>=0&&c.x<6&&c.y<6) occupied.add(key(c.x,c.y));
    }
    function validRotatedPlacement() {
      const s = currentSofa();
      if (!s) return false;
      return footprint(s,rotated).every(c => c.x>=0&&c.y>=0&&c.x<6&&c.y<6&&!occupied.has(key(c.x,c.y)));
    }
    function syncRotationPreview() {
      sofa.dataset.rotated = String(rotated);
      if (!isEditing()) return;
      grid.querySelectorAll('.grid-cell').forEach(el => el.classList.remove('preview-valid','preview-invalid'));
      const s = currentSofa();
      const ok = validRotatedPlacement();
      for (const c of footprint(s,rotated)) {
        const el = grid.querySelector(`[data-x="${c.x}"][data-y="${c.y}"]`);
        if (el) el.classList.add(ok?'preview-valid':'preview-invalid');
      }
      const okButton = hud.querySelector('[data-hud="ok"]');
      if (okButton) okButton.disabled = !ok;
    }
    function positionHud() {
      if (hud.hidden) return;
      const rr = room.getBoundingClientRect();
      const sr = sofa.getBoundingClientRect();
      const hw = hud.offsetWidth || 132, hh = hud.offsetHeight || 152;
      let x = sr.right - rr.left + 9;
      let y = sr.top - rr.top + sr.height * .56;
      if (x + hw > rr.width - 8) x = sr.left - rr.left - hw - 9;
      x = Math.max(8, Math.min(rr.width - hw - 8, x));
      y = Math.max(hh * .5 + 8, Math.min(rr.height - hh * .5 - 8, y));
      hud.style.left = `${x}px`;
      hud.style.top = `${y}px`;
    }
    function syncDisabled() {
      const s = currentSofa();
      for (const [dir, oldButton] of Object.entries(legacyMoves)) {
        const button = hud.querySelector(`[data-iso="${dir}"]`);
        if (button) button.disabled = !oldButton || oldButton.disabled;
      }
      if (s && rotated) {
        const dl = hud.querySelector('[data-iso="dl"]');
        if (dl && s.y>=4) dl.disabled = true;
      }
      syncRotationPreview();
    }
    function syncHud() {
      const editing = isEditing();
      hud.hidden = !editing;
      sofa.setAttribute('aria-selected', String(editing));
      sofa.dataset.rotated = String(rotated);
      if (editing) requestAnimationFrame(() => { syncDisabled(); positionHud(); });
    }
    function beginBackup() {
      if (editBackup) return;
      const saved = readSaved() || currentSofa();
      if (saved) editBackup = {...saved, rotated};
      clearBothFootprints(saved);
    }
    function reconcileAfterFinish() {
      const s = currentSofa() || readSaved();
      clearBothFootprints(editBackup);
      clearBothFootprints(s);
      addCurrentFootprint();
      localStorage.setItem(ROTATION_KEY, rotated ? '1' : '0');
      editBackup = null;
      sofa.dataset.rotated = String(rotated);
    }

    sofa.addEventListener('click', event => {
      if (sofa.hidden) return;
      event.preventDefault(); event.stopPropagation();
      if (!isEditing()) {
        beginBackup();
        sofaButton.click();
      }
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
      if (action === 'rotate') {
        rotated = !rotated;
        sofa.dataset.rotated = String(rotated);
        native.timeout(() => { syncDisabled(); positionHud(); }, 0);
        return;
      }
      if (action === 'ok') {
        if (!validRotatedPlacement()) return;
        legacyConfirm.click();
        native.timeout(() => { reconcileAfterFinish(); syncHud(); }, 0);
        return;
      }
      if (action === 'cancel') {
        if (editBackup) rotated = !!editBackup.rotated;
        legacyCancel.click();
        native.timeout(() => { reconcileAfterFinish(); syncHud(); }, 0);
      }
    });
    sofaButton.addEventListener('click', () => {
      if (!isEditing()) beginBackup();
      native.timeout(() => { if (isEditing()) clearBothFootprints(editBackup); syncHud(); }, 0);
    });
    legacyConfirm.addEventListener('click', () => native.timeout(syncHud, 0));
    legacyCancel.addEventListener('click', () => native.timeout(syncHud, 0));
    new MutationObserver(syncHud).observe(room, {attributes:true, attributeFilter:['class']});
    new MutationObserver(syncHud).observe(legacyPanel, {attributes:true, attributeFilter:['hidden']});
    new MutationObserver(() => { if (!hud.hidden) native.timeout(positionHud, 0); }).observe(sofa, {attributes:true, attributeFilter:['style','hidden']});
    window.addEventListener('resize', positionHud, {passive:true});
    if (sofaImg) sofaImg.setAttribute('draggable','false');
    native.timeout(() => { addCurrentFootprint(); syncHud(); }, 0);
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
