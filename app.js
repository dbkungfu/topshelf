/* Top Shelf — drag-and-drop tier lists for board game box art.
   (Storage keys such as the 'gametier' database keep their original name so saved lists carry over.)
   No dependencies. State is autosaved as .json files + an images/ folder inside a folder you choose (Chrome/Edge); nothing is stored in the browser. */
(() => {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* State                                                               */
  /* ------------------------------------------------------------------ */

  const TIER_COLORS = ['#f0746e', '#f2a154', '#ebcb5b', '#a6cf63', '#5cc2a7', '#6ca2e8', '#a98be6', '#e57fb0'];
  const DEFAULT_TIERS = [
    ['S', TIER_COLORS[0]], ['A', TIER_COLORS[1]], ['B', TIER_COLORS[2]],
    ['C', TIER_COLORS[3]], ['D', TIER_COLORS[4]], ['E', TIER_COLORS[5]],
  ];

  // Bump these for each release; the number shows in the footer, the ⋯ menu and the About page.
  const APP_VERSION = '1.6.1';
  const APP_RELEASED = '2026-11-26';

  const uid = () => Math.random().toString(36).slice(2, 9);

  const defaultState = (title = 'My board game tier list') => ({
    id: uid(),
    title,
    size: 'md',
    names: false,
    tiers: DEFAULT_TIERS.map(([label, color]) => ({ id: uid(), label, color, items: [] })),
    tray: [],
    items: {},
  });

  let state = defaultState();

  /* ------------------------------------------------------------------ */
  /* DOM refs & helpers                                                  */
  /* ------------------------------------------------------------------ */

  const $ = (sel) => document.querySelector(sel);
  const board = $('#board');
  const trayZone = $('#trayZone');
  const trayEmpty = $('#trayEmpty');
  const trayCount = $('#trayCount');
  const fileInput = $('#fileInput');
  const popover = $('#popover');
  const toastEl = $('#toast');
  const titleInput = $('#listTitle');

  const ico = (d, extra = '') => `<svg viewBox="0 0 20 20" aria-hidden="true" ${extra}><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const ICON = {
    copy: ico('M7 7V4.5A1.5 1.5 0 0 1 8.5 3h7A1.5 1.5 0 0 1 17 4.5v7a1.5 1.5 0 0 1-1.5 1.5H13M4.5 7h7A1.5 1.5 0 0 1 13 8.5v7a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 3 15.5v-7A1.5 1.5 0 0 1 4.5 7z'),
    download: ico('M10 3v9m0 0-3.5-3.5M10 12l3.5-3.5M4 15.5h12'),
    share: ico('M10 12.5V3m0 0L6.5 6.5M10 3l3.5 3.5M5 10v6.5h10V10'),
    backup: ico('M4 6.5C4 5.1 6.7 4 10 4s6 1.1 6 2.5S13.3 9 10 9 4 7.9 4 6.5zM4 6.5v7C4 14.9 6.7 16 10 16s6-1.1 6-2.5v-7M4 10c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5'),
    import: ico('M10 12.5V3M10 3L6.5 6.5M10 3l3.5 3.5M4 14v2.5h12V14'),
    palette: ico('M10 3a7 7 0 1 0 0 14c1.1 0 1.6-.8 1.3-1.6-.3-.9.1-1.9 1.2-1.9H14a3 3 0 0 0 3-3C17 6 14 3 10 3zM6.6 9.2v.01M9 6.6v.01M12.4 7v.01'),
    movie: ico('M9.1 5.5a2.6 2.6 0 1 1-5.2 0 2.6 2.6 0 0 1 5.2 0zM14.6 5.5a2.6 2.6 0 1 1-5.2 0 2.6 2.6 0 0 1 5.2 0zM4 9h7a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5v-4A1.5 1.5 0 0 1 4 9zM12.5 11.5l5-2v7l-5-2'),
    movieOff: ico('M9.1 5.5a2.6 2.6 0 1 1-5.2 0 2.6 2.6 0 0 1 5.2 0zM14.6 5.5a2.6 2.6 0 1 1-5.2 0 2.6 2.6 0 0 1 5.2 0zM4 9h7a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5v-4A1.5 1.5 0 0 1 4 9zM12.5 11.5l5-2v7l-5-2M3 2.5l14 15'),
    soundOn: ico('M3.5 8v4h3l4 3V5l-4 3h-3zM13.5 7.5a3.5 3.5 0 0 1 0 5M15.5 5a6.5 6.5 0 0 1 0 10'),
    soundOff: ico('M3.5 8v4h3l4 3V5l-4 3h-3zM13.5 8l4 4M17.5 8l-4 4'),
    help: ico('M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM7.9 8a2.1 2.1 0 1 1 3.3 1.7c-.7.5-1.2.9-1.2 1.8M10 14v.01'),
    info: ico('M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM10 9.2V14M10 6.5v.01'),
    folder: ico('M3 6.5A1.5 1.5 0 0 1 4.5 5H8l1.7 2h5.8A1.5 1.5 0 0 1 17 8.5v6a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5v-8z'),
    reset: ico('M4 10a6 6 0 1 0 2-4.5M4 3.5V6h2.5'),
    plus: ico('M10 4v12M4 10h12'),
    trash: ico('M4.5 6h11M8 6V4.5h4V6M6 6l.7 9.5h6.6L14 6'),
    check: ico('M4.5 10.5l3.5 3.5 7.5-8'),
    install: ico('M10 3v9m0 0-3-3m3 3 3-3M5 13v2.5A1.5 1.5 0 0 0 6.5 17h7a1.5 1.5 0 0 0 1.5-1.5V13'),
    layers: ico('M10 3.5l7 3.8-7 3.8-7-3.8 7-3.8zM3 11.2l7 3.8 7-3.8'),
    sun: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="3.4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    moon: ico('M16.5 11.8A6.8 6.8 0 0 1 8.2 3.5a6.8 6.8 0 1 0 8.3 8.3z'),
    eye: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M1.8 10S5 4.5 10 4.5 18.2 10 18.2 10 15 15.5 10 15.5 1.8 10 1.8 10z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="10" cy="10" r="2.6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    eyeOff: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M1.8 10S5 4.5 10 4.5 18.2 10 18.2 10 15 15.5 10 15.5 1.8 10 1.8 10z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" opacity=".55"/><circle cx="10" cy="10" r="2.6" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".55"/><path d="M3.5 16.5l13-13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  };

  const SVG = {
    close: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 2l6 6M8 2L2 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    gear: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="4.5" r="1.5" fill="currentColor"/><circle cx="10" cy="10" r="1.5" fill="currentColor"/><circle cx="10" cy="15.5" r="1.5" fill="currentColor"/></svg>',
  };

  function h(tag, className, attrs) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (attrs) for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  }

  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

  function inkFor(hex) {
    const n = parseInt(hex.slice(1), 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    // Pick whichever ink gives the higher WCAG contrast ratio (dark ink luminance ≈ 0.008).
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return (L + 0.05) / 0.058 >= 1.05 / (L + 0.05) ? '#14171c' : '#ffffff';
  }

  /* Each tier shows at most MAX_ROWS rows of tiles. When a tier has more games than fit
     at the normal size, its tiles shrink (all by the same amount) until they fit.
     Used by both the on-screen board and the PNG export so they always match. */
  const MAX_ROWS = 2;

  function rowsNeeded(ars, h, availW, gap) {
    let rows = 1, x = 0;
    for (const ar of ars) {
      const w = Math.ceil(h * ar);
      if (x > 0 && x + w > availW) { rows++; x = 0; }
      x += w + gap;
    }
    return rows;
  }

  function fitTileHeight(ars, availW, gap, baseH, minH) {
    if (!ars.length || availW <= 0) return baseH;
    if (rowsNeeded(ars, baseH, availW, gap) <= MAX_ROWS) return baseH;
    let lo = minH, hi = baseH; // invariant: `hi` is too big; `lo` is the floor
    if (rowsNeeded(ars, lo, availW, gap) > MAX_ROWS) return lo; // too many games even at the floor size
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (rowsNeeded(ars, mid, availW, gap) <= MAX_ROWS) lo = mid; else hi = mid;
    }
    return lo;
  }

  /* Game names always start every word with a capital letter ("lost ruins of arnak" becomes
     "Lost Ruins Of Arnak"). Only the first letter of each word changes: the rest stays as typed,
     so "GloomHaven", "7th Continent" and "King's Quest" are left alone. Words also start after
     hyphens, slashes and opening brackets or quotes. */
  function titleCaseName(name) {
    return String(name).replace(/(^|[\s\-–—/(\[{"“])(\p{Ll})/gu, (_, lead, ch) => lead + ch.toUpperCase());
  }

  const labelLen = (label) => (label.length <= 2 ? 'short' : label.length <= 4 ? String(label.length) : 'long');

  /* ------------------------------------------------------------------ */
  /* Persistence: plain .json files plus images/ in a folder on disk.    */
  /*  'folder' - a folder the user picks (File System Access API)        */
  /*  'memory' - nothing can be saved (banner explains)                  */
  /* No list data is kept in the browser.                                */
  /* ------------------------------------------------------------------ */

  const META_KEY = 'index';        // lists/index.json: { order: [listId], active: listId, index: { listId: { title, count } } }
  const SETTINGS_KEY = 'settings'; // lists/settings.json: { theme, preview }
  const listKey = (id) => `list-${id}`; // lists/list-<id>.json
  const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

  let meta = { order: [], active: null, index: {} };
  let booted = false;

  let storeMode = 'pending';  // 'folder' | 'memory'
  const memStore = new Map(); // only used in 'memory' mode (lives and dies with this tab)
  let markStoreReady;
  const storeReady = new Promise((resolve) => { markStoreReady = resolve; });

  async function storeGet(key) {
    if (storeMode === 'memory') return memStore.has(key) ? JSON.parse(memStore.get(key)) : null;
    if (storeMode === 'folder') {
      const text = await folderReadText(`${key}.json`);
      if (text === null) return null;
      const value = JSON.parse(text);
      if (key.startsWith('list-')) await resolveFolderImages(value);
      return value;
    }
    return null;
  }

  /* ---- Folder backend: a folder the user picked (File System Access API, Chrome/Edge) ----
     Layout: index.json, list-<id>.json, settings.json, images/.
     Pictures are shown from blob: URLs at runtime and written back as "api/img/<name>". */
  const FOLDER_SUPPORTED = typeof window.showDirectoryPicker === 'function';
  const IMG_NAME = /^[a-f0-9]{32}\.(png|jpg|webp|gif)$/;
  const IMG_MIME = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' };
  const MIME_EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
  let pickedHandle = null;     // the folder the user chose (permission is requested on this one)
  let dirHandle = null;        // where the files live (the chosen folder, or a "Top Shelf lists" folder inside it)
  let imgDirHandle = null;
  let folderLabel = '';
  const blobByName = new Map();
  const nameByBlob = new Map();

  async function folderReadText(name) {
    try { return await (await (await dirHandle.getFileHandle(name)).getFile()).text(); }
    catch (e) { if (e && e.name === 'NotFoundError') return null; throw e; }
  }

  async function folderWrite(dir, name, data) {
    const w = await (await dir.getFileHandle(name, { create: true })).createWritable();
    try { await w.write(data); await w.close(); } catch (e) { try { await w.abort(); } catch { /* ignore */ } throw e; }
  }

  async function folderPermission(request) {
    const opts = { mode: 'readwrite' };
    if ((await pickedHandle.queryPermission(opts)) === 'granted') return true;
    return !!request && (await pickedHandle.requestPermission(opts)) === 'granted';
  }

  async function attachFolder(picked) {
    let root = picked;
    let hasIndex = true;
    try { await picked.getFileHandle('index.json'); } catch { hasIndex = false; }
    const nm = picked.name.toLowerCase();
    // Keep a user's files tidy: unless this already is a Top Shelf folder, use a sub-folder inside it.
    if (!hasIndex && nm !== 'lists' && nm !== 'top shelf lists') root = await picked.getDirectoryHandle('Top Shelf lists', { create: true });
    imgDirHandle = await root.getDirectoryHandle('images', { create: true });
    dirHandle = root;
    pickedHandle = picked;
    folderLabel = picked.name;
  }

  // The browser can only remember a folder by keeping the handle in IndexedDB. It is a pointer, not your data.
  const handleDb = () => new Promise((resolve, reject) => {
    const r = indexedDB.open('topshelf-folder', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('h');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  async function rememberFolder(handle) {
    try {
      const db = await handleDb();
      await new Promise((resolve, reject) => { const tx = db.transaction('h', 'readwrite'); tx.objectStore('h').put(handle, 'dir'); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
      db.close();
    } catch { /* not remembered: you'll be asked again next time */ }
  }
  async function recallFolder() {
    try {
      const db = await handleDb();
      const h = await new Promise((resolve, reject) => { const r = db.transaction('h').objectStore('h').get('dir'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
      db.close();
      return h && h.kind === 'directory' ? h : null;
    } catch { return null; }
  }

  async function resolveFolderImages(s) {
    const items = Object.values(s.items || {}).filter((it) => it && typeof it.src === 'string' && IMG_URL.test(it.src));
    const wanted = [...new Set(items.map((it) => it.src.slice('api/img/'.length)))].filter((n) => !blobByName.has(n));
    await Promise.all(wanted.map(async (n) => {
      try {
        const file = await (await imgDirHandle.getFileHandle(n)).getFile();
        const url = URL.createObjectURL(file.slice(0, file.size, IMG_MIME[n.split('.')[1]]));
        blobByName.set(n, url); nameByBlob.set(url, n);
      } catch { /* missing file: that tile just shows no picture */ }
    }));
    for (const it of items) { const url = blobByName.get(it.src.slice('api/img/'.length)); if (url) it.src = url; }
  }

  async function externalizeToFolder(s) {
    const pending = Object.values(s.items).filter((it) => DATA_IMG.test(it.src));
    let next = 0;
    const worker = async () => {
      while (next < pending.length) {
        const it = pending[next++];
        const blob = await (await fetch(it.src)).blob();
        const ext = MIME_EXT[blob.type];
        if (!ext) throw new Error('unsupported image');
        const bytes = await blob.arrayBuffer();
        let hex;
        try { hex = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((b) => b.toString(16).padStart(2, '0')).join(''); }
        catch { hex = (uid() + uid() + uid() + uid() + uid()).replace(/[^a-f0-9]/g, '0').padEnd(32, '0'); }
        const name = `${hex.slice(0, 32)}.${ext}`;
        if (!blobByName.has(name)) {
          let exists = true;
          try { await imgDirHandle.getFileHandle(name); } catch { exists = false; }
          if (!exists) await folderWrite(imgDirHandle, name, blob);
          const url = URL.createObjectURL(blob);
          blobByName.set(name, url); nameByBlob.set(url, name);
        }
        it.src = blobByName.get(name);
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, pending.length) }, worker));
  }

  // Remove pictures no list uses any more (skips anything newer than 10 minutes, and stops if a list can't be read).
  async function gcFolderImages() {
    const used = new Set();
    for await (const [fname, h] of dirHandle.entries()) {
      if (h.kind === 'file' && /^list-.*\.json$/.test(fname)) {
        const text = await (await h.getFile()).text();
        for (const m of text.matchAll(/api\/img\/([a-f0-9]{32}\.(?:png|jpg|webp|gif))/g)) used.add(m[1]);
      }
    }
    for await (const [n, h] of imgDirHandle.entries()) {
      if (h.kind === 'file' && IMG_NAME.test(n) && !used.has(n) && Date.now() - (await h.getFile()).lastModified > 10 * 60 * 1000) {
        await imgDirHandle.removeEntry(n);
        const url = blobByName.get(n); if (url) { nameByBlob.delete(url); blobByName.delete(n); }
      }
    }
  }

  /* Box art lives in images/<hash>.<ext>; a list file only refers to it ("api/img/<name>").
     New pictures arrive as data URLs; they are written to images/ just before the list that uses them is saved. */
  const IMG_URL = /^api\/img\/[a-f0-9]{32}\.(png|jpg|webp|gif)$/;
  const DATA_IMG = /^data:image\/(png|jpeg|webp|gif);base64,/;

  const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

  // A copy of a list with every picture embedded again, for a single-file backup.
  async function withEmbeddedImages(s) {
    const copy = JSON.parse(JSON.stringify(s));
    for (const it of Object.values(copy.items)) {
      if (DATA_IMG.test(it.src)) continue;
      const res = await fetch(it.src, { cache: 'no-store' });
      if (!res.ok) throw new Error('missing image');
      it.src = await blobToDataUrl(await res.blob());
    }
    return copy;
  }

  async function storeSet(key, value) {
    if (storeMode === 'folder' && key.startsWith('list-')) await externalizeToFolder(value);
    if (storeMode === 'folder') {
      // blob: URLs go back to their file names on the way out
      await folderWrite(dirHandle, `${key}.json`, JSON.stringify(value, (k, v) => (k === 'src' && typeof v === 'string' && nameByBlob.has(v) ? `api/img/${nameByBlob.get(v)}` : v)));
      return;
    }
    memStore.set(key, JSON.stringify(value));
  }

  async function storeDel(key) {
    if (storeMode === 'memory') { memStore.delete(key); return; }
    try { await dirHandle.removeEntry(`${key}.json`); } catch (e) { if (!e || e.name !== 'NotFoundError') throw e; }
  }

  /* Banner shown when changes are not reaching your folder */
  const noticeEl = $('#saveNotice');
  const noticeText = $('#saveNoticeText');
  const noticeBtn = $('#saveNoticeBtn');

  function setNotice(kind) {
    if (!kind) { noticeEl.hidden = true; return; }
    const pick = kind === 'memory' && FOLDER_SUPPORTED;
    noticeBtn.hidden = !(kind === 'failed' || pick);
    noticeBtn.textContent = pick ? 'Choose folder…' : 'Try again';
    noticeBtn.dataset.action = pick ? 'choose' : 'retry';
    noticeText.textContent = {
      memory: FOLDER_SUPPORTED
        ? 'Your lists are not being saved. Choose a folder and Top Shelf will keep every change there as ordinary files. Until then, use ⋯ › Back up all lists to keep your work.'
        : 'Your lists are not being saved, because this browser can’t save to a folder. Open Top Shelf in Chrome or Edge, or use ⋯ › Back up all lists to keep your work.',
      failed: 'Couldn’t save to your folder. It may have been moved or renamed, or access may have been withdrawn. Click Try again and allow access. Your changes are safe in this tab until you close it.',
      unreadable: 'Couldn’t read your saved lists from your folder, so saving is paused to keep them safe. Check the folder is still there, then reload this page.',
    }[kind];
    noticeEl.hidden = false;
  }

  const gameCount = (s) => Object.keys(s.items).length;

  let writesInFlight = 0;
  let writeChain = Promise.resolve();

  async function doWrite() {
    meta.index[state.id] = { title: state.title, count: gameCount(state) };
    try {
      await storeSet(listKey(state.id), state);
      await storeSet(META_KEY, meta);
      if (storeMode !== 'memory') setNotice(null);
    } catch {
      setNotice('failed');
    }
  }

  // Writes run strictly one after another so an older save can never overwrite a newer one.
  function writeNow() {
    if (!booted) return Promise.resolve();
    writesInFlight++;
    const run = writeChain.then(doWrite, doWrite).finally(() => { writesInFlight--; });
    writeChain = run;
    return run;
  }

  let saveTimer = 0;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { saveTimer = 0; writeNow(); }, 400);
  }

  // Write any pending change immediately (used before switching lists).
  async function flushSave() {
    clearTimeout(saveTimer);
    saveTimer = 0;
    await writeNow();
  }

  noticeBtn.addEventListener('click', async () => {
    if (noticeBtn.dataset.action === 'choose') { chooseFolderNow(); return; }
    if (storeMode === 'folder') {
      let granted = false;
      try { granted = await folderPermission(true); } catch { /* handled below */ }
      if (!granted) { toast('Top Shelf needs access to the folder to save.'); return; }
    }
    await writeNow();
    if (noticeEl.hidden) toast('Saved');
  });

  // Warn before closing the tab if something hasn't been saved yet (or can't be).
  window.addEventListener('beforeunload', (e) => {
    const memoryWork = storeMode === 'memory' && booted
      && (gameCount(state) > 0 || Object.values(meta.index).some((i) => i && i.count > 0));
    const unsaved = !!saveTimer || writesInFlight > 0 || memoryWork || (storeMode === 'folder' && !noticeEl.hidden);
    if (unsaved) { e.preventDefault(); e.returnValue = ''; }
  });

  /* Preferences (theme, hover preview) are stored in lists/settings.json too */
  function saveSettings() {
    storeReady.then(() => storeSet(SETTINGS_KEY, {
      theme: currentTheme(),
      preview: document.documentElement.dataset.preview === 'off' ? 'off' : 'on',
      fx: fxOn ? 'on' : 'off',
      sound: fxSound ? 'on' : 'off',
    })).catch(() => { /* the banner already tells the user saving is unavailable */ });
  }

  function sanitize(raw) {
    const base = defaultState();
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.tiers)) return base;
    const items = {};
    for (const [id, it] of Object.entries(raw.items || {})) {
      if (it && typeof it.src === 'string' && (IMG_URL.test(it.src) || DATA_IMG.test(it.src) || it.src.startsWith('blob:'))) {
        items[id] = {
          id, name: titleCaseName(it.name || 'Untitled'), src: it.src, ar: clamp(Number(it.ar) || 1, 0.6, 1.6),
          hash: typeof it.hash === 'string' ? it.hash : undefined,
          dh: typeof it.dh === 'string' && /^[01]{64}$/.test(it.dh) ? it.dh : undefined,
        };
      }
    }
    const seen = new Set();
    const keep = (ids) => (Array.isArray(ids) ? ids : []).filter((id) => items[id] && !seen.has(id) && seen.add(id));
    const tiers = raw.tiers.map((t) => ({
      id: String(t.id || uid()),
      label: String(t.label ?? '').slice(0, 24) || 'Tier',
      color: /^#[0-9a-f]{6}$/i.test(t.color) ? t.color : TIER_COLORS[0],
      items: keep(t.items),
    }));
    const tray = keep(raw.tray);
    for (const id of Object.keys(items)) if (!seen.has(id)) tray.push(id);
    return {
      id: typeof raw.id === 'string' && raw.id ? raw.id : base.id,
      title: String(raw.title ?? base.title).slice(0, 80),
      size: ['sm', 'md', 'lg'].includes(raw.size) ? raw.size : 'md',
      names: !!raw.names,
      tiers: tiers.length ? tiers : base.tiers,
      tray,
      items,
    };
  }

  /* ------------------------------------------------------------------ */
  /* Data operations                                                     */
  /* ------------------------------------------------------------------ */

  const listOf = (zone) => (zone === 'tray' ? state.tray : (state.tiers.find((t) => t.id === zone) || {}).items);

  function zoneOfItem(id) {
    if (state.tray.includes(id)) return 'tray';
    const t = state.tiers.find((tier) => tier.items.includes(id));
    return t ? t.id : null;
  }

  function detach(id) {
    const from = zoneOfItem(id);
    if (!from) return null;
    const list = listOf(from);
    const index = list.indexOf(id);
    list.splice(index, 1);
    return { zone: from, index };
  }

  function placeItem(id, zone, index) {
    detach(id);
    const list = listOf(zone);
    if (!list) return;
    list.splice(index == null ? list.length : clamp(index, 0, list.length), 0, id);
  }

  /* The Unranked tray is always listed A to Z by game name (case-insensitive; numbers sort
     naturally, so "Game 2" comes before "Game 10"). */
  const nameCompare = (a, b) => {
    const x = state.items[a].name, y = state.items[b].name;
    return x.localeCompare(y, undefined, { numeric: true, sensitivity: 'base' }) || (a < b ? -1 : a > b ? 1 : 0);
  };
  const sortTray = () => state.tray.sort(nameCompare);

  let lastRemoved = null;
  function removeItem(id) {
    const item = state.items[id];
    if (!item) return;

    // A ranked game goes back to Unranked; only a game already in Unranked is deleted.
    const zone = zoneOfItem(id);
    if (zone && zone !== 'tray') {
      const tile = tileById(id);
      const rect = tile ? tile.getBoundingClientRect() : null;   // the cinematic hop starts where the tile was
      const from = detach(id);
      state.tray.push(id);
      commit({ from: rect && rect.width ? { id, rect } : null });
      toast(`Moved “${item.name}” back to Unranked`, {
        action: 'Undo',
        onAction: () => {
          if (!state.items[id] || !listOf(from.zone)) return;
          const t = tileById(id);
          const rect = t ? t.getBoundingClientRect() : null;
          placeItem(id, from.zone, from.index);
          commit({ from: rect && rect.width ? { id, rect } : null });
        },
      });
      return;
    }

    const where = detach(id);
    delete state.items[id];
    lastRemoved = { item, where };
    commit();
    toast(`Removed “${item.name}”`, { action: 'Undo', onAction: undoRemove });
  }

  function undoRemove() {
    if (!lastRemoved) return;
    const { item, where } = lastRemoved;
    lastRemoved = null;
    state.items[item.id] = item;
    const zone = listOf(where.zone) ? where.zone : 'tray';
    placeItem(item.id, zone, where.index);
    commit();
  }

  /* Re-render after a change. Tiles glide from their old position to the new one (FLIP),
     and a tile dropped by hand settles from where it was released. */
  function commit(opts = {}) {
    const before = captureRects();
    render();
    if (opts.from && fxLand(opts.from.id, opts.from.rect, !!opts.shine)) {
      before.delete(opts.from.id);               // the fly-in effect moves this tile
      playFlip(before, { ...opts, from: null, shine: false });
    } else {
      playFlip(before, opts);
    }
    save();
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function captureRects() {
    const rects = new Map();
    document.querySelectorAll('.tile').forEach((t) => {
      const r = t.getBoundingClientRect();
      if (r.width) rects.set(t.dataset.id, r);
    });
    return rects;
  }

  function playFlip(before, opts = {}) {
    const landId = opts.from && opts.from.id;
    if (landId) before.set(landId, opts.from.rect);
    const tiles = document.querySelectorAll('.tile');
    if (reducedMotion.matches || tiles.length > 150 || typeof Element.prototype.animate !== 'function') {
      if (landId && opts.shine) flashTile(landId);
      return;
    }
    let landAnim = null;
    tiles.forEach((t) => {
      const old = before.get(t.dataset.id);
      if (!old) return;
      const now = t.getBoundingClientRect();
      if (!now.width) return;
      const dx = old.left - now.left, dy = old.top - now.top;
      const sx = old.width / now.width, sy = old.height / now.height;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < 0.02 && Math.abs(sy - 1) < 0.02) return;
      const anim = t.animate(
        [
          { transformOrigin: '0 0', transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
          { transformOrigin: '0 0', transform: 'none' },
        ],
        { duration: t.dataset.id === landId ? 300 : 240, easing: 'cubic-bezier(.2,.8,.2,1)' },
      );
      if (t.dataset.id === landId) landAnim = { anim, tile: t };
    });
    if (landAnim) {
      landAnim.anim.finished.then(() => {
        landAnim.tile.animate(
          [{ transform: 'scale(1)' }, { transform: 'scale(1.08)', offset: 0.45 }, { transform: 'scale(1)' }],
          { duration: 240, easing: 'ease-out' },
        );
        if (opts.shine) flashTile(landId);
      }).catch(() => {});
    } else if (landId && opts.shine) {
      flashTile(landId);
    }
  }

  // A brief golden shine on a game that just landed in the top tier.
  function flashTile(id) {
    const t = document.querySelector(`.tile[data-id="${id}"]`);
    if (!t) return;
    t.classList.add('is-shine');
    setTimeout(() => t.classList.remove('is-shine'), 1300);
  }

  /* ------------------------------------------------------------------ */
  /* Cinematic effect                                                    */
  /* New covers streak in from high above like a superhero landing;      */
  /* ranked tiles swoop to their row. Both end in an impact burst.       */
  /* ------------------------------------------------------------------ */

  let fxOn = true;          // user setting (lists/settings.json)
  let fxSound = false;      // whoosh + thud, off unless the user turns it on
  const flying = new Set(); // ids of tiles currently hidden because their flyer is in the air
  const landing = new Set(); // ids whose flyer is on its way to a new place (so closing a dialog must not reveal them early)
  const fxLayer = h('div', 'fx-layer', { 'aria-hidden': 'true' });
  document.body.append(fxLayer);

  const fxActive = () => fxOn && !reducedMotion.matches && typeof Element.prototype.animate === 'function';
  const rand = (a, b) => a + Math.random() * (b - a);
  const tileById = (id) => document.querySelector(`.tile[data-id="${id}"]`);

  // The tile's on-screen rectangle, or null if it can't be seen (off screen or scrolled out of its panel).
  function fxVisibleRect(tile) {
    const r = tile.getBoundingClientRect();
    if (!r.width) return null;
    let l = 0, t = 0, rt = innerWidth, b = innerHeight;
    for (let p = tile.parentElement; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (/(auto|scroll|hidden|clip)/.test(cs.overflowX + cs.overflowY)) {
        const pr = p.getBoundingClientRect();
        l = Math.max(l, pr.left); t = Math.max(t, pr.top); rt = Math.min(rt, pr.right); b = Math.min(b, pr.bottom);
      }
    }
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    return cx > l && cx < rt && cy > t && cy < b ? r : null;
  }

  /* --- sound (synthesised, so there are no audio files) --- */
  let audioCtx = null, noiseBuf = null;

  function audio() {
    if (!fxSound) return null;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return audioCtx;
    } catch { return null; }
  }

  function noise(ctx) {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }

  function playWhoosh(seconds) {
    const ctx = audio(); if (!ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = noise(ctx); src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(220, t); bp.frequency.exponentialRampToValueAtTime(2600, t + seconds * 0.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.28, t + seconds * 0.72);
    g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    src.connect(bp).connect(g).connect(ctx.destination);
    src.start(t); src.stop(t + seconds + 0.05);
  }

  function playThud(power) {
    const ctx = audio(); if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(130, t); osc.frequency.exponentialRampToValueAtTime(42, t + 0.22);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.55 * power + 0.1, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    osc.connect(g).connect(ctx.destination); osc.start(t); osc.stop(t + 0.32);
    const n = ctx.createBufferSource(); n.buffer = noise(ctx);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.3 * power, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    n.connect(lp).connect(ng).connect(ctx.destination); n.start(t); n.stop(t + 0.16);
  }

  /* --- impact: flash, rings and sparks where a tile touches down --- */
  function fxPart(cls, css, host = fxLayer) {
    const el = h('div', cls);
    el.style.cssText = css;
    host.append(el);
    return el;
  }

  function fxImpact(r, power, host = fxLayer) {
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    // Capped, so a big picture (the rank dialog) doesn't spawn screen-sized rings that are slow to paint.
    const R = Math.min(230, Math.max(r.width, r.height) * (0.9 + power * 0.9));
    const done = (a, el) => { a.onfinish = () => el.remove(); };

    const flash = fxPart('fx-flash', `left:${cx - R}px;top:${cy - R}px;width:${R * 2}px;height:${R * 2}px`, host);
    done(flash.animate([{ opacity: 0.95, transform: 'scale(.35)' }, { opacity: 0, transform: 'scale(1.25)' }], { duration: 420, easing: 'ease-out' }), flash);

    const ring = (radius, accent, delay, ms) => {
      const el = fxPart(`fx-ring${accent ? ' is-accent' : ''}`, `left:${cx - radius}px;top:${cy - radius}px;width:${radius * 2}px;height:${radius * 2}px`, host);
      done(el.animate(
        [{ opacity: 0.95, transform: 'scale(.12)' }, { opacity: 0, transform: 'scale(1)' }],
        { duration: ms, delay, easing: 'cubic-bezier(.12,.7,.3,1)', fill: 'backwards' }), el);
    };
    ring(R, false, 0, 560);
    if (power > 0.5) ring(R * 1.7, true, 90, 700);
    if (power > 0.85) ring(R * 2.6, false, 170, 820);

    const sparks = Math.round(5 + 11 * power);
    for (let i = 0; i < sparks; i++) {
      const a = rand(0, Math.PI * 2), d = rand(0.55, 1.5) * R * 1.2;
      const s = fxPart('fx-spark', `left:${cx - 2}px;top:${cy - 2}px`, host);
      done(s.animate(
        [{ opacity: 1, transform: 'translate(0,0) scale(1)' }, { opacity: 0, transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d + 14}px) scale(.2)` }],
        { duration: rand(420, 720), easing: 'cubic-bezier(.1,.7,.3,1)' }), s);
    }

    playThud(power);
  }

  // A tile has arrived: show the real one again, with a little pop (and a shine if asked).
  function fxReveal(id, shine) {
    flying.delete(id);
    landing.delete(id);
    const t = tileById(id);
    if (!t) return;
    t.style.visibility = '';
    t.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 260, easing: 'ease-out' });
    if (shine) flashTile(id);
  }

  function fxFlyer(item, r, host = fxLayer) {
    const f = h('div', 'fx-flyer');
    f.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
    f.append(h('img', '', { src: item.src, alt: '', draggable: 'false' }));
    host.append(f);
    return { f };
  }

  const tf = (x, y, s, rt) => `translate(${x}px, ${y}px) rotate(${rt}rad) scale(${s})`;
  const glow = (blur, bright, g) => `blur(${blur}px) brightness(${bright}) drop-shadow(0 0 ${g}px var(--fx-glow))`;

  // A quick rattle of the image itself that dies away, between two points of the animation.
  function shakeFrames(from, to, steps, amp, filter) {
    const out = [];
    for (let i = 0; i < steps; i++) {
      const k = 1 - i / (steps + 1);
      const sign = i % 2 ? 1 : -1;
      out.push({
        offset: from + ((to - from) * (i + 1)) / (steps + 1),
        opacity: 1,
        transform: tf(sign * amp * k * rand(0.75, 1.1), rand(-0.45, 0.45) * amp * k, 1, sign * 0.045 * k * Math.min(1, amp / 8)),
        ...(filter ? { filter } : {}),
      });
    }
    return out;
  }

  /* New covers: from far above, small and faint, streaking down toward the screen. */
  function fxSky(id, r, delay, dur, rich) {
    const item = state.items[id];
    if (!item) { flying.delete(id); return; }
    const { f } = fxFlyer(item, r);
    // Start as a tiny speck high on the screen (or just above it) and fly toward where the tile belongs.
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const x0 = clamp(cx + rand(-0.3, 0.12) * innerWidth, 24, innerWidth - 24);
    const y0 = Math.min(cy - 280, innerHeight * 0.07);
    const dx0 = x0 - cx;
    const dy0 = y0 - cy;
    const rot = clamp(Math.atan2(dx0, -dy0), -0.6, 0.6);
    // It swells as it nears the camera: big enough to fill a good part of the screen, then settles to size.
    const peak = clamp(Math.min(innerHeight * 0.5 / r.height, innerWidth * 0.32 / r.width), 1.8, 3.4);
    const grow = (t) => 0.07 * Math.pow(peak / 0.07, t / 0.74);   // exponential, like something approaching
    const at = (p, s, rt, extra) => Object.assign({ transform: tf(dx0 * (1 - p), dy0 * (1 - p), s, rt) }, extra);
    const fl = (b, br, g) => (rich ? { filter: glow(b, br, g) } : {});

    const anim = f.animate([
      at(0, 0.07, rot, { opacity: 0, offset: 0, ...fl(6, 2.4, 18) }),
      { opacity: 1, offset: 0.1 },
      at(0.16, grow(0.3), rot, { opacity: 1, offset: 0.3, ...fl(3, 1.9, 22) }),
      at(0.55, grow(0.55), rot * 0.7, { opacity: 1, offset: 0.55, ...fl(1, 1.5, 26) }),
      { transform: tf(0, -26, peak, rot * 0.1), opacity: 1, offset: 0.7, ...fl(0, 1.25, 30) },
      { transform: tf(0, 0, 0.92, 0), opacity: 1, offset: 0.78, ...fl(0, 1.1, 10) },        // touchdown
      ...shakeFrames(0.78, 1, rich ? 7 : 4, rich ? 11 : 4, rich ? glow(0, 1.05, 6) : null), // the image rattles, then calms
      { transform: tf(0, 0, 1, 0), opacity: 1, offset: 1, ...fl(0, 1, 0) },
    ], { duration: dur, delay, easing: 'linear', fill: 'both' });

    if (rich) setTimeout(() => playWhoosh(dur / 1000 * 0.8), delay);
    setTimeout(() => fxImpact(r, rich ? 1 : 0.35), delay + dur * 0.78);   // the moment it touches down
    anim.finished.catch(() => {}).then(() => { f.remove(); fxReveal(id, false); });
  }

  /* A tile that moved: it hops from where it was, swelling mid-air, and lands in its new place. */
  function fxHop(id, from, to, shine) {
    const item = state.items[id];
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    const dist = Math.hypot(dx, dy);
    const power = shine ? 1 : dist > 260 ? 0.7 : 0.45;

    if (!item || dist < 36) {           // dropped right where it belongs: just the impact
      fxReveal(id, shine);
      fxImpact(to, power);
      return;
    }
    const dur = clamp(dist * 0.55 + 420, 600, 980);
    const { f } = fxFlyer(item, to);
    const s0 = from.width / to.width;
    const rot = clamp(Math.atan2(dx, -dy), -0.4, 0.4);
    const lift = clamp(dist * 0.25, 30, 130);
    const peak = clamp(Math.min(innerHeight * 0.4 / to.height, innerWidth * 0.25 / to.width), 1.5, 2.6);

    const anim = f.animate([
      { transform: tf(dx, dy, s0, 0), filter: glow(0, 1, 0), offset: 0, easing: 'cubic-bezier(.25,.1,.4,1)' },
      { transform: tf(dx * 0.5, dy * 0.5 - lift, peak, rot), filter: glow(0, 1.3, 22), offset: 0.5, easing: 'cubic-bezier(.5,0,.85,.55)' },
      { transform: tf(0, 0, 0.92, 0), filter: glow(0, 1.1, 8), offset: 0.78 },             // touchdown
      ...shakeFrames(0.78, 1, 5, 7, glow(0, 1.05, 4)),                                       // rattle, then calm
      { transform: tf(0, 0, 1, 0), filter: glow(0, 1, 0), offset: 1 },
    ], { duration: dur, fill: 'both' });

    if (power >= 0.7) playWhoosh(dur / 1000 * 0.7);
    setTimeout(() => fxImpact(to, power), dur * 0.78);
    anim.finished.catch(() => {}).then(() => { f.remove(); fxReveal(id, shine); });
  }

  // Newly added covers fly in one after another: the first few in full, the rest quicker so big batches stay short.
  function fxFlyIn(ids) {
    if (!fxActive()) return;
    const targets = [];
    for (const id of ids) {
      const tile = tileById(id);
      const r = tile && fxVisibleRect(tile);
      if (r) targets.push({ id, tile, r });
    }
    if (!targets.length) return;

    const FULL = 4, STEP = 280;
    const gap = clamp(1500 / Math.max(1, targets.length - FULL), 18, 60);
    // Hide every flying tile in this same frame, so none flashes before its turn.
    targets.forEach(({ id, tile }) => { flying.add(id); tile.style.visibility = 'hidden'; });
    targets.forEach(({ id, r }, i) => {
      const rich = i < FULL;
      fxSky(id, r, rich ? i * STEP : FULL * STEP + (i - FULL) * gap, rich ? 1150 : 560, rich);
    });
  }

  /* Clicking a tile: the rank dialog itself grows out of the tile. It starts as a small card sitting exactly on the
     tile (its picture lined up with the tile), is thrown out in a boomerang arc while turning over once, and comes to
     rest in the middle of the screen, so the tile and the popup read as one object. Closing it without ranking plays
     the same flight backwards, into the tile. No impact on landing. */
  let quickFlight = null;
  const FLY_OUT_MS = 1500, FLY_BACK_MS = 850;

  function fxEndFlyOut(restoreTile) {
    const fl = quickFlight;
    if (!fl) return;
    quickFlight = null;
    if (fl.anim) fl.anim.cancel();
    if (fl.spins) fl.spins.forEach((a) => a.cancel());
    quickDialog.style.transformOrigin = '';
    quickDialog.classList.remove('is-flying', 'is-growing', 'is-leaving');
    if (restoreTile && !landing.has(fl.id)) fxReveal(fl.id, false);
  }

  // Where the popup's picture is now versus where the tile is; null when it cannot be measured.
  function popupGeom(from) {
    const img = $('#quickImg');
    const dlg = quickDialog.getBoundingClientRect();
    const to = img.getBoundingClientRect();
    if (!to.width || !dlg.width) return null;
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    return {
      // Pivot on the picture, so shrinking the dialog keeps the picture exactly where the tile is.
      ox: to.left + to.width / 2 - dlg.left, oy: to.top + to.height / 2 - dlg.top,
      dx, dy,
      s0: Math.max(0.04, from.width / to.width),
      lift: clamp(Math.hypot(dx, dy) * 0.12, 30, 110),
      // The boomerang: thrown out past the middle to the far side, then curving back to land at the centre.
      swing: (dx > 0 ? -1 : 1) * clamp(Math.abs(dx) * 0.5, 110, 300),
      // Games picked from Unranked turn one way; games clicked in a tier row turn the opposite way.
      dir: zoneOfItem(quickId) === 'tray' ? 1 : -1,
    };
  }

  // One smooth path sampled finely (so the browser only draws short straight steps, with no change of pace
  // between segments). k runs 0 (small card on the tile) to 1 (popup centred); the way back plays it in reverse.
  function runPopupFlight(fl, g, reverse, dur) {
    const N = 56, pos = [], front = [], back = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const k = reverse ? 1 - t : t;
      const e = 1 - Math.pow(1 - k, 2.6);          // quick launch, soft landing
      const arc = Math.sin(Math.PI * e);
      const x = g.dx * (1 - e) + g.swing * 1.25 * arc;
      const y = g.dy * (1 - e) - g.lift * 1.6 * arc;
      const sc = g.s0 + (1 - g.s0) * e + 0.05 * arc;
      const rt = -0.1 * (1 - e) + 0.06 * arc;
      const opacity = Math.min(1, k / 0.03);
      pos.push({ transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${rt.toFixed(4)}rad) scale(${sc.toFixed(4)})`, opacity, offset: t });
      // One turn around the vertical axis (front -> card back -> front), leaning in as it goes; direction set by g.dir.
      const lean = (deg) => `perspective(1400px) rotateX(${(16 * arc).toFixed(2)}deg) rotateY(${(deg - g.dir * 360 * e).toFixed(2)}deg)`;
      front.push({ transform: lean(0), offset: t });
      back.push({ transform: lean(180), offset: t });
    }
    const opts = { duration: dur, fill: reverse ? 'forwards' : 'none' };
    fl.anim = quickDialog.animate(pos, opts);
    fl.spins = [
      quickDialog.querySelector('.quick-card').animate(front, opts),
      quickDialog.querySelector('.quick-back').animate(back, opts),
    ];
    if (reverse) {   // the dimmed, blurred backdrop fades away with it
      try { fl.spins.push(quickDialog.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur, fill: 'forwards', pseudoElement: '::backdrop' })); } catch { /* older browsers: it just closes */ }
    }
  }

  async function fxFlyOut(id, from) {
    const tile = tileById(id);
    if (!state.items[id] || !tile) { quickDialog.classList.remove('is-flying'); return; }
    flying.add(id);
    tile.style.visibility = 'hidden';
    const fl = { id, anim: null, spins: null };
    quickFlight = fl;

    const img = $('#quickImg');
    try { await img.decode(); } catch { /* measured as soon as it is laid out */ }
    if (quickFlight !== fl || !quickDialog.open || quickId !== id) return;   // closed while waiting; the close handler cleaned up

    const g = popupGeom(from);
    if (!g) { fxEndFlyOut(true); return; }
    quickDialog.style.transformOrigin = `${g.ox}px ${g.oy}px`;
    runPopupFlight(fl, g, false, FLY_OUT_MS);
    // The first frame is already queued, so the hold-back class can go without a flash.
    quickDialog.classList.remove('is-flying');
    quickDialog.classList.add('is-growing');
    playWhoosh(0.7);

    fl.anim.finished.catch(() => {}).then(() => {
      if (quickFlight !== fl) return;
      quickDialog.style.transformOrigin = '';
      quickDialog.classList.remove('is-growing');
    });
  }

  // Closing the popup without ranking: it flies back into its tile, then closes. Returns after starting the flight
  // (or after a plain close when the effect is off or the tile cannot be seen).
  function closeQuick() {
    if (!quickDialog.open) return;
    if (quickFlight && quickFlight.back) return;                  // already on its way back
    const id = quickId;
    const tile = id && tileById(id);
    const from = fxActive() && tile ? fxVisibleRect(tile) : null;
    const busy = quickFlight && !quickFlight.back && (!quickFlight.anim || quickFlight.anim.playState !== 'finished');
    const g = from && !busy && quickDialog.getBoundingClientRect().width ? popupGeom(from) : null;
    if (!g) { quickDialog.close(); return; }
    fxEndFlyOut(false);
    const fl = { id, anim: null, spins: null, back: true };
    quickFlight = fl;
    quickDialog.style.transformOrigin = `${g.ox}px ${g.oy}px`;
    quickDialog.classList.add('is-growing', 'is-leaving');
    runPopupFlight(fl, g, true, FLY_BACK_MS);
    playWhoosh(0.5);
    fl.anim.finished.catch(() => {}).then(() => { if (quickFlight === fl && quickDialog.open) quickDialog.close(); });
  }

  // Returns true when the effect took over the landing (the caller must then not animate that tile itself).
  function fxLand(id, fromRect, shine) {
    if (!fxActive() || !fromRect) return false;
    const tile = tileById(id);
    const to = tile && fxVisibleRect(tile);
    if (!to) return false;
    flying.add(id);
    landing.add(id);
    tile.style.visibility = 'hidden';
    fxHop(id, fromRect, to, shine);
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* Rendering                                                           */
  /* ------------------------------------------------------------------ */

  function tileEl(id) {
    const item = state.items[id];
    const tile = h('div', 'tile', { tabindex: '0', role: 'listitem', 'aria-label': item.name, title: item.name });
    tile.dataset.id = id;
    tile.style.setProperty('--ar', item.ar);
    if (flying.has(id)) tile.style.visibility = 'hidden';

    const img = h('img', '', { src: item.src, alt: '', draggable: 'false' });
    const name = h('div', 'tile-name');
    const span = h('span');
    span.textContent = item.name;
    name.append(span);

    const ranked = zoneOfItem(id) !== 'tray';
    const rmLabel = ranked ? `Move ${item.name} back to Unranked` : `Remove ${item.name}`;
    const rm = h('button', 'tile-remove', { type: 'button', 'aria-label': rmLabel, title: ranked ? 'Back to Unranked' : 'Remove', tabindex: '-1' });
    rm.innerHTML = SVG.close;

    tile.append(img, name, rm);
    return tile;
  }

  function applyTierColor(labelEl, tier) {
    labelEl.style.setProperty('--tier-color', tier.color);
    labelEl.style.setProperty('--tier-ink', inkFor(tier.color));
    labelEl.dataset.len = labelLen(tier.label);
  }

  function tierEl(tier) {
    const row = h('div', 'tier', { role: 'group', 'aria-label': `Tier ${tier.label}` });
    row.dataset.tier = tier.id;

    const label = h('div', 'tier-label');
    const text = h('span', 'tier-label-text', { contenteditable: 'true', spellcheck: 'false', role: 'textbox', 'aria-label': 'Tier name', 'data-placeholder': 'Tier' });
    text.textContent = tier.label;
    label.append(text);
    applyTierColor(label, tier);

    const zone = h('div', 'zone', { role: 'list', 'aria-label': `Games in tier ${tier.label}` });
    zone.dataset.zone = tier.id;
    tier.items.forEach((id) => zone.append(tileEl(id)));

    const tools = h('div', 'tier-tools');
    const gear = h('button', 'icon-btn', { type: 'button', 'aria-label': `Settings for tier ${tier.label}`, 'aria-haspopup': 'dialog', 'aria-expanded': 'false' });
    gear.innerHTML = SVG.gear;
    tools.append(gear);

    row.append(label, zone, tools);
    return row;
  }

  function render() {
    document.body.dataset.size = state.size;
    document.body.classList.toggle('names-on', state.names);
    const nb = $('#namesToggle');
    nb.setAttribute('aria-pressed', String(state.names));
    nb.title = state.names ? 'Game names: shown. Click to hide' : 'Game names: hidden. Click to show under each box';
    nb.setAttribute('aria-label', state.names ? 'Hide game names' : 'Show game names');
    document.querySelectorAll('.segmented button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.size === state.size)));
    if (document.activeElement !== titleInput) titleInput.value = state.title;
    document.title = `${state.title || 'Tier list'} — Top Shelf`;

    if (typeof hideZoom === 'function') hideZoom();
    board.replaceChildren(...state.tiers.map(tierEl));

    sortTray();
    trayZone.replaceChildren(...state.tray.map(tileEl));
    const total = Object.keys(state.items).length;
    trayEmpty.hidden = total > 0;
    trayZone.hidden = total === 0;
    trayCount.textContent = state.tray.length;
    layoutTiers();
    renderStats();
    syncMeta();
  }

  /* ---- Stats strip: how much is ranked, and how the ranked games spread across tiers ---- */

  const statsEl = $('#stats');

  function renderStats() {
    const total = gameCount(state);
    if (!total) { statsEl.replaceChildren(); return; }
    const ranked = total - state.tray.length;

    const text = h('div', 'stats-text');
    const a = h('strong'); a.textContent = ranked;
    const b = h('strong'); b.textContent = total;
    text.append(a, ' of ', b, total === 1 ? ' game ranked' : ' games ranked');

    const bar = h('div', 'stats-bar', { role: 'img', 'aria-label': `${ranked} of ${total} games ranked` });
    const legend = h('div', 'stats-legend');
    state.tiers.forEach((t) => {
      if (!t.items.length) return;
      const seg = h('span', '', { title: `${t.label}: ${t.items.length}` });
      seg.style.setProperty('--c', t.color);
      seg.style.flex = `0 0 ${(t.items.length / total) * 100}%`;
      bar.append(seg);

      const item = h('span');
      item.style.setProperty('--c', t.color);
      const dot = h('i');
      const lab = document.createTextNode(`${t.label} `);
      const n = h('b'); n.textContent = t.items.length;
      item.append(dot, lab, n);
      legend.append(item);
    });
    if (state.tray.length) {
      const item = h('span');
      item.style.setProperty('--c', 'var(--line-strong)');
      const n = h('b'); n.textContent = state.tray.length;
      item.append(h('i'), 'Unranked ', n);
      legend.append(item);
    }
    statsEl.replaceChildren(text, bar, legend);
  }

  // Keep the list menu's titles and counts current without waiting for a save.
  function syncMeta() {
    if (state.id) meta.index[state.id] = { title: state.title, count: gameCount(state) };
  }

  // Shrink the tiles of any tier that would otherwise need more than MAX_ROWS rows.
  const TILE_MIN = 20;
  const COMPACT_BELOW = 60;

  function layoutTiers() {
    const base = parseFloat(getComputedStyle(board).getPropertyValue('--tile')) || 88;
    board.querySelectorAll('.tier').forEach((row) => {
      const tier = state.tiers.find((t) => t.id === row.dataset.tier);
      const zone = row.querySelector('.zone');
      if (!tier || !zone) return;
      const cs = getComputedStyle(zone);
      const availW = zone.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 1;
      const gap = parseFloat(cs.columnGap) || 6;
      const ars = tier.items.map((id) => state.items[id].ar);
      const h = fitTileHeight(ars, availW, gap, base, TILE_MIN);
      if (h < base) zone.style.setProperty('--tile', h + 'px'); else zone.style.removeProperty('--tile');
      zone.dataset.compact = h < COMPACT_BELOW ? '1' : '';
      zone.dataset.shrunk = h < base ? '1' : '';
    });
  }

  let layoutRaf = 0;
  new ResizeObserver(() => {
    cancelAnimationFrame(layoutRaf);
    layoutRaf = requestAnimationFrame(layoutTiers);
  }).observe(board);

  /* ------------------------------------------------------------------ */
  /* Toast & dialogs                                                   */
  /* ------------------------------------------------------------------ */

  let toastTimer = 0;
  function toast(message, opts = {}) {
    clearTimeout(toastTimer);
    toastEl.replaceChildren();
    const span = h('span');
    span.textContent = message;
    toastEl.append(span);
    if (opts.action) {
      const btn = h('button', 'toast-action', { type: 'button' });
      btn.textContent = opts.action;
      btn.addEventListener('click', () => { toastEl.hidden = true; opts.onAction && opts.onAction(); });
      toastEl.append(btn);
    }
    toastEl.hidden = false;
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, opts.duration || (opts.action ? 6000 : 2800));
  }

  function confirmDialog({ title, text, ok }) {
    const dlg = $('#confirmDialog');
    $('#confirmTitle').textContent = title;
    $('#confirmText').textContent = text;
    const okBtn = $('#confirmOk');
    okBtn.textContent = ok;
    okBtn.value = 'ok';
    dlg.returnValue = '';
    return new Promise((resolve) => {
      dlg.addEventListener('close', () => resolve(dlg.returnValue === 'ok'), { once: true });
      dlg.showModal();
    });
  }
  $('#confirmCancel').addEventListener('click', () => $('#confirmDialog').close('cancel'));

  let renamingId = null;
  function openRename(id) {
    const item = state.items[id];
    if (!item) return;
    renamingId = id;
    const dlg = $('#renameDialog');
    const input = $('#renameInput');
    input.value = item.name;
    $('#renameForm button[type="submit"]').value = 'ok';
    dlg.returnValue = '';
    dlg.showModal();
    input.select();
  }
  $('#renameDialog').addEventListener('close', (e) => {
    const dlg = e.target;
    if (dlg.returnValue === 'ok' && renamingId && state.items[renamingId]) {
      const next = titleCaseName($('#renameInput').value.trim());
      if (next) { state.items[renamingId].name = next; commit(); }
    }
    renamingId = null;
  });
  $('#renameCancel').addEventListener('click', () => $('#renameDialog').close('cancel'));

  /* ------------------------------------------------------------------ */
  /* Pointer-based drag and drop (mouse, touch and pen)                  */
  /* ------------------------------------------------------------------ */

  const DRAG_THRESHOLD = 6;
  let drag = null;

  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (drag) return;
    const tile = e.target.closest('.tile');
    if (!tile || e.target.closest('.tile-remove')) return;
    const rect = tile.getBoundingClientRect();
    drag = {
      id: tile.dataset.id, tile, pointerId: e.pointerId,
      startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY,
      offX: e.clientX - rect.left, offY: e.clientY - rect.top, w: rect.width, h: rect.height,
      started: false, ghost: null, marker: null, zone: null, index: 0, raf: 0,
    };
  });

  document.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    drag.x = e.clientX; drag.y = e.clientY;
    if (!drag.started) {
      if (Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < DRAG_THRESHOLD) return;
      startDrag();
    }
    e.preventDefault();
    moveGhost();
    updateDrop();
  }, { passive: false });

  document.addEventListener('pointerup', (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const d = drag;
    if (d.started) {
      const { zone, index } = d;
      const ghostRect = d.ghost ? d.ghost.getBoundingClientRect() : null;
      endDrag();
      if (zone) {
        const fromZone = zoneOfItem(d.id);
        placeItem(d.id, zone, index);
        // Dropping into a different top-tier row earns a little celebration.
        const intoTop = zone !== 'tray' && zone === state.tiers[0].id && fromZone !== zone && state.tiers.length > 1;
        commit({ from: ghostRect ? { id: d.id, rect: ghostRect } : null, shine: intoTop });
      } else {
        d.tile.classList.remove('is-lifted');
      }
    } else {
      // A tap or click without dragging opens the quick-rank dialog.
      drag = null;
      if (d.tile.isConnected && e.target.closest && e.target.closest('.tile') === d.tile) openQuick(d.id);
    }
  });

  document.addEventListener('pointercancel', (e) => {
    if (drag && e.pointerId === drag.pointerId) {
      if (drag.started) { drag.tile.classList.remove('is-lifted'); endDrag(); } else drag = null;
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drag && drag.started) { drag.tile.classList.remove('is-lifted'); endDrag(); }
  });

  function startDrag() {
    drag.started = true;
    try { drag.tile.releasePointerCapture(drag.pointerId); } catch { /* not captured */ }
    document.body.classList.add('is-dragging');
    closePopover();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();

    const ghost = h('div', 'drag-ghost');
    ghost.style.width = drag.w + 'px';
    ghost.style.height = drag.h + 'px';
    const img = drag.tile.querySelector('img').cloneNode();
    ghost.append(img);
    document.body.append(ghost);
    drag.ghost = ghost;
    drag.marker = h('div', 'drop-marker');
    drag.tile.classList.add('is-lifted');

    const loop = () => {
      if (!drag || !drag.started) return;
      const edge = 90;
      const vh = window.innerHeight;
      if (drag.y < edge) window.scrollBy(0, -Math.ceil(20 * (1 - drag.y / edge)));
      else if (drag.y > vh - edge) window.scrollBy(0, Math.ceil(20 * (1 - (vh - drag.y) / edge)));
      updateDrop();
      drag.raf = requestAnimationFrame(loop);
    };
    drag.raf = requestAnimationFrame(loop);
  }

  function moveGhost() {
    drag.ghost.style.transform = `translate(${drag.x - drag.offX}px, ${drag.y - drag.offY}px) scale(1.04)`;
  }

  function zoneAt(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const zone = el.closest('[data-zone]');
    if (zone) return zone;
    const row = el.closest('.tier');
    if (row) return row.querySelector('[data-zone]');
    if (el.closest('.tray') && !trayZone.hidden) return trayZone;
    return null;
  }

  function insertionIndex(zoneEl, x, y) {
    const tiles = [...zoneEl.children].filter((c) => c.classList.contains('tile') && !c.classList.contains('is-lifted'));
    for (let i = 0; i < tiles.length; i++) {
      const r = tiles[i].getBoundingClientRect();
      if (y < r.top) return { index: i, ref: tiles[i] };
      if (y <= r.bottom && x < r.left + r.width / 2) return { index: i, ref: tiles[i] };
    }
    return { index: tiles.length, ref: null };
  }

  function updateDrop() {
    const zoneEl = zoneAt(drag.x, drag.y);
    document.querySelectorAll('.is-over').forEach((n) => { if (n !== zoneEl) n.classList.remove('is-over'); });
    if (!zoneEl) {
      drag.marker.remove();
      drag.zone = null;
      return;
    }
    zoneEl.classList.add('is-over');
    let { index, ref } = insertionIndex(zoneEl, drag.x, drag.y);
    if (zoneEl.dataset.zone === 'tray') {
      // Unranked is kept A to Z, so the marker shows where the game will really land.
      const mine = state.items[drag.id].name;
      const tiles = [...zoneEl.children].filter((c) => c.classList.contains('tile') && !c.classList.contains('is-lifted'));
      index = tiles.findIndex((t) => mine.localeCompare(state.items[t.dataset.id].name, undefined, { numeric: true, sensitivity: 'base' }) < 0);
      if (index < 0) index = tiles.length;
      ref = tiles[index] || null;
    }
    drag.zone = zoneEl.dataset.zone;
    drag.index = index;
    const m = drag.marker;
    let next = m.nextElementSibling;
    while (next && next.classList.contains('is-lifted')) next = next.nextElementSibling;
    if (m.parentNode !== zoneEl || next !== ref) zoneEl.insertBefore(m, ref);
  }

  function endDrag() {
    cancelAnimationFrame(drag.raf);
    drag.ghost && drag.ghost.remove();
    drag.marker && drag.marker.remove();
    document.querySelectorAll('.is-over').forEach((n) => n.classList.remove('is-over'));
    document.body.classList.remove('is-dragging');
    drag = null;
  }

  /* ------------------------------------------------------------------ */
  /* Hover zoom (mouse only)                                             */
  /* ------------------------------------------------------------------ */

  const zoomEl = $('#zoom');
  const zoomScrim = $('#zoomScrim');
  const zoomImg = zoomEl.querySelector('.zoom-media img');
  const zoomCard = zoomEl.querySelector('.zoom-card');
  const zoomFrame = zoomEl.querySelector('.zoom-frame');
  const zoomMedia = zoomEl.querySelector('.zoom-media');
  const zoomMeta = zoomEl.querySelector('.zoom-meta');
  const zoomName = zoomEl.querySelector('.zoom-name');
  const zoomStatus = zoomEl.querySelector('.zoom-status');
  const zoomKeys = zoomEl.querySelector('.zoom-keys');
  const zoomHint = zoomEl.querySelector('.zoom-hint');
  const ZOOM_DELAY = 220;
  const ZOOM_MAX = 560;
  const ZOOM_MIN_W = 340;
  let zoomTimer = 0;
  let zoomTile = null;

  function hideZoom() {
    clearTimeout(zoomTimer);
    zoomTile = null;
    zoomEl.classList.remove('is-visible');
    zoomEl.classList.remove('is-open');
    zoomScrim.classList.remove('is-visible');
    zoomCard.style.transform = '';
    document.body.classList.remove('zoom-active');
    document.querySelectorAll('.zoom-target').forEach((t) => t.classList.remove('zoom-target'));
  }

  /* The preview borrows its colors from the box art: a glow behind the card, the border,
     the vignette and the info panel all follow the game's dominant color. */
  const accentCache = new Map();

  function accentFor(id, imgEl) {
    if (accentCache.has(id)) return accentCache.get(id);
    let r = 0, g = 0, b = 0, w = 0;
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 24;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(imgEl, 0, 0, 24, 24);
      const d = x.getImageData(0, 0, 24, 24).data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 128) continue;
        const max = Math.max(d[i], d[i + 1], d[i + 2]), min = Math.min(d[i], d[i + 1], d[i + 2]);
        const sat = max ? (max - min) / max : 0, val = max / 255;
        const wt = (sat * sat + 0.04) * (val > 0.15 ? 1 : 0.2) * (0.4 + val); // favour vivid, reasonably bright pixels
        r += d[i] * wt; g += d[i + 1] * wt; b += d[i + 2] * wt; w += wt;
      }
    } catch { /* fall through to the default accent */ }
    let css = '#e2b04a';
    if (w > 0) {
      // Convert to HSL and keep it vivid and bright enough to glow on a dark or light page.
      const R = r / w / 255, G = g / w / 255, B = b / w / 255;
      const max = Math.max(R, G, B), min = Math.min(R, G, B), l0 = (max + min) / 2, dlt = max - min;
      let hue = 0, s0 = 0;
      if (dlt) {
        s0 = l0 > 0.5 ? dlt / (2 - max - min) : dlt / (max + min);
        hue = max === R ? ((G - B) / dlt + (G < B ? 6 : 0)) : max === G ? (B - R) / dlt + 2 : (R - G) / dlt + 4;
        hue *= 60;
      }
      css = `hsl(${Math.round(hue)} ${Math.round(clamp(s0, 0.5, 0.95) * 100)}% ${Math.round(clamp(l0, 0.5, 0.64) * 100)}%)`;
    }
    accentCache.set(id, css);
    return css;
  }

  const previewEnabled = () => document.documentElement.dataset.preview !== 'off';

  function showZoom(tile) {
    if (!previewEnabled()) return;
    const item = state.items[tile.dataset.id];
    if (!item) return;
    const id = tile.dataset.id;
    zoomImg.src = item.src;
    zoomName.textContent = item.name;

    // Colors taken from the artwork
    document.body.style.setProperty('--zoom-accent', accentFor(id, tile.querySelector('img')));
    zoomEl.style.setProperty('--zoom-src', `url("${item.src}")`);

    // Where the game sits right now, plus a keycap for every tier it could jump to
    const zone = zoneOfItem(id);
    const tier = state.tiers.find((t) => t.id === zone);
    zoomStatus.dataset.state = tier ? 'ranked' : 'unranked';
    zoomStatus.textContent = tier ? `Tier ${tier.label}` : 'Unranked';
    if (tier) {
      zoomStatus.style.setProperty('--tier-color', tier.color);
      zoomStatus.style.setProperty('--tier-ink', inkFor(tier.color));
    } else {
      zoomStatus.style.removeProperty('--tier-color');
      zoomStatus.style.removeProperty('--tier-ink');
    }
    const keys = state.tiers.slice(0, 9).map((t, i) => {
      const k = h('span', 'zoom-key' + (t.id === zone ? ' is-current' : ''));
      k.style.setProperty('--c', t.color);
      k.style.setProperty('--ink', inkFor(t.color));
      const kbd = h('kbd'); kbd.textContent = i + 1;
      k.append(kbd, t.label);
      return k;
    });
    const none = h('span', 'zoom-key is-none' + (!tier ? ' is-current' : ''));
    const nk = h('kbd'); nk.textContent = '0';
    none.append(nk, 'Unranked');
    zoomKeys.replaceChildren(...keys, none);
    zoomHint.textContent = 'Press a number to rank. Click for more options.';

    // Size: as large as fits, leaving room for the info panel underneath
    const maxH = Math.min(ZOOM_MAX, window.innerHeight - 210);
    const maxW = Math.min(ZOOM_MAX, window.innerWidth * 0.7);
    let hh = Math.max(160, maxH), ww = hh * item.ar;
    if (ww > maxW) { ww = maxW; hh = ww / item.ar; }
    const totalW = Math.max(Math.round(ww), Math.min(ZOOM_MIN_W + 60, window.innerWidth - 24));
    zoomEl.style.width = totalW + 'px';
    zoomFrame.style.width = Math.round(ww) + 'px';
    zoomFrame.style.height = Math.round(hh) + 'px';
    zoomMeta.style.width = totalW + 'px';
    zoomCard.style.transform = '';
    zoomMedia.style.setProperty('--gx', '30%');
    zoomMedia.style.setProperty('--gy', '18%');

    // Blur every other tile so the previewed one is the only sharp image on the page.
    document.querySelectorAll('.zoom-target').forEach((t) => t.classList.remove('zoom-target'));
    tile.classList.add('zoom-target');
    document.body.classList.add('zoom-active');

    // Centered in the viewport, independent of where the hovered tile is.
    zoomEl.classList.add('is-open');
    const totalH = zoomEl.offsetHeight;
    zoomEl.style.left = Math.round((window.innerWidth - totalW) / 2) + 'px';
    zoomEl.style.top = Math.max(8, Math.round((window.innerHeight - totalH) / 2)) + 'px';
    requestAnimationFrame(() => {
      if (zoomTile !== tile) return;
      zoomEl.classList.add('is-visible');
      zoomScrim.classList.add('is-visible');
    });
  }

  // The card tilts toward the pointer and catches the light, like a box held under a lamp.
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !zoomTile || !zoomEl.classList.contains('is-visible') || reducedMotion.matches) return;
    const r = zoomTile.getBoundingClientRect();
    const nx = clamp((e.clientX - (r.left + r.width / 2)) / (r.width * 0.75), -1, 1);
    const ny = clamp((e.clientY - (r.top + r.height / 2)) / (r.height * 0.75), -1, 1);
    zoomCard.style.transform = `rotateX(${(-ny * 7).toFixed(2)}deg) rotateY(${(nx * 9).toFixed(2)}deg)`;
    zoomMedia.style.setProperty('--gx', `${(50 + nx * 38).toFixed(1)}%`);
    zoomMedia.style.setProperty('--gy', `${(50 + ny * 38).toFixed(1)}%`);
  });

  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const tile = e.target.closest ? e.target.closest('.tile') : null;
    if (drag || !tile || quickDialog.open) { if (zoomTile) hideZoom(); return; }
    if (tile === zoomTile) return;
    const wasOpen = zoomEl.classList.contains('is-open');
    clearTimeout(zoomTimer);
    zoomTile = tile;
    // Preview switched off: still remember the hovered tile so hover + number ranking keeps working.
    if (!previewEnabled()) return;
    // Moving between neighbouring tiles feels better without the initial delay.
    if (wasOpen) showZoom(tile);
    else zoomTimer = setTimeout(() => { if (zoomTile === tile) showZoom(tile); }, ZOOM_DELAY);
  });

  document.documentElement.addEventListener('mouseleave', hideZoom);
  document.addEventListener('pointerdown', hideZoom);

  // Hover a tile and press a number to rank it without clicking or dragging.
  document.addEventListener('keydown', (e) => {
    const tile = zoomTile;
    const typing = e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"], dialog, .tile');
    if (tile && tile.isConnected && !typing && !e.metaKey && !e.ctrlKey && !e.altKey && /^[0-9]$/.test(e.key) && !drag) {
      const id = tile.dataset.id;
      const n = Number(e.key);
      const target = n === 0 ? 'tray' : state.tiers[n - 1] && state.tiers[n - 1].id;
      if (target) {
        e.preventDefault();
        rankItem(id, target);
        return;
      }
    }
    hideZoom();
  });
  window.addEventListener('scroll', hideZoom, true);
  window.addEventListener('blur', hideZoom);

  /* ------------------------------------------------------------------ */
  /* Tile interactions: remove, rename, keyboard                         */
  /* ------------------------------------------------------------------ */

  document.addEventListener('click', (e) => {
    const rm = e.target.closest('.tile-remove');
    if (rm) removeItem(rm.closest('.tile').dataset.id);
  });

  // Move a game to a tier (or 'tray'). Used by hover keys, the quick-rank dialog and the keyboard.
  function rankItem(id, zone) {
    if (!state.items[id] || !listOf(zone)) return false;
    const from = zoneOfItem(id);
    if (from === zone) return false;
    const tile = document.querySelector(`.tile[data-id="${id}"]`);
    const rect = tile ? tile.getBoundingClientRect() : null;
    placeItem(id, zone);
    const intoTop = zone !== 'tray' && zone === state.tiers[0].id && state.tiers.length > 1;
    commit({ from: rect && rect.width ? { id, rect } : null, shine: intoTop });
    return true;
  }

  function refocus(id) {
    const t = document.querySelector(`.tile[data-id="${id}"]`);
    if (t) t.focus({ preventScroll: false });
  }

  document.addEventListener('keydown', (e) => {
    const tile = e.target.closest && e.target.closest('.tile');
    if (!tile || e.target !== tile || e.metaKey || e.ctrlKey || e.altKey) return;
    const id = tile.dataset.id;

    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      const n = Number(e.key);
      const target = n === 0 ? 'tray' : state.tiers[n - 1] && state.tiers[n - 1].id;
      if (!target) return;
      rankItem(id, target);
      refocus(id);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      removeItem(id);
    }
  });

  /* ------------------------------------------------------------------ */
  /* Tier label editing                                                  */
  /* ------------------------------------------------------------------ */

  const tierOfNode = (node) => state.tiers.find((t) => t.id === node.closest('.tier').dataset.tier);

  board.addEventListener('input', (e) => {
    if (!e.target.classList.contains('tier-label-text')) return;
    const tier = tierOfNode(e.target);
    tier.label = e.target.textContent.replace(/\s+/g, ' ').slice(0, 24);
    e.target.closest('.tier-label').dataset.len = labelLen(tier.label || 'x');
    save();
  });

  board.addEventListener('keydown', (e) => {
    if (e.target.classList.contains('tier-label-text') && e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
  });

  board.addEventListener('paste', (e) => {
    if (!e.target.classList.contains('tier-label-text')) return;
    e.preventDefault();
    const text = (e.clipboardData.getData('text/plain') || '').replace(/\s+/g, ' ');
    document.execCommand('insertText', false, text);
  });

  board.addEventListener('focusout', (e) => {
    if (!e.target.classList.contains('tier-label-text')) return;
    const tier = tierOfNode(e.target);
    tier.label = tier.label.trim() || 'Tier';
    e.target.textContent = tier.label;
    e.target.closest('.tier-label').dataset.len = labelLen(tier.label);
    e.target.closest('.tier').setAttribute('aria-label', `Tier ${tier.label}`);
    save();
  });

  /* ------------------------------------------------------------------ */
  /* Tier settings popover                                               */
  /* ------------------------------------------------------------------ */

  let popTier = null;
  let popAnchor = null;

  board.addEventListener('click', (e) => {
    const gear = e.target.closest('.icon-btn');
    if (!gear) return;
    const id = gear.closest('.tier').dataset.tier;
    if (popTier === id && !popover.hidden) closePopover();
    else openPopover(id, gear);
  });

  function openPopover(tierId, anchor) {
    closePopover();
    const tier = state.tiers.find((t) => t.id === tierId);
    if (!tier) return;
    popTier = tierId;
    popAnchor = anchor;
    anchor.setAttribute('aria-expanded', 'true');
    const index = state.tiers.indexOf(tier);

    const nameField = h('label', 'pop-field');
    nameField.append(Object.assign(h('span', 'pop-label'), { textContent: 'Name' }));
    const nameInput = h('input', 'pop-input', { type: 'text', maxlength: '24', autocomplete: 'off', spellcheck: 'false' });
    nameInput.value = tier.label;
    nameField.append(nameInput);

    const colorField = h('div', 'pop-field');
    colorField.append(Object.assign(h('span', 'pop-label'), { textContent: 'Color' }));
    const swatches = h('div', 'swatches');
    const swatchBtns = [];
    const syncSwatches = () => swatchBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.color === tier.color.toLowerCase())));
    TIER_COLORS.forEach((c) => {
      const b = h('button', 'swatch', { type: 'button', 'aria-label': `Color ${c}`, 'aria-pressed': 'false' });
      b.style.setProperty('--c', c);
      b.dataset.color = c;
      swatches.append(b); swatchBtns.push(b);
    });
    const custom = h('label', 'swatch swatch-custom', { 'aria-label': 'Custom color' });
    const picker = h('input', '', { type: 'color' });
    picker.value = tier.color;
    custom.append(picker);
    swatches.append(custom);
    colorField.append(swatches);
    syncSwatches();

    const setColor = (c) => {
      tier.color = c;
      const labelEl = board.querySelector(`.tier[data-tier="${tier.id}"] .tier-label`);
      applyTierColor(labelEl, tier);
      syncSwatches();
      save();
    };
    swatches.addEventListener('click', (e) => { const b = e.target.closest('.swatch[data-color]'); if (b) setColor(b.dataset.color); });
    picker.addEventListener('input', () => setColor(picker.value.toLowerCase()));

    nameInput.addEventListener('input', () => {
      tier.label = nameInput.value.slice(0, 24);
      const row = board.querySelector(`.tier[data-tier="${tier.id}"]`);
      row.querySelector('.tier-label-text').textContent = tier.label;
      row.querySelector('.tier-label').dataset.len = labelLen(tier.label || 'x');
      save();
    });
    nameInput.addEventListener('blur', () => {
      if (!tier.label.trim()) { tier.label = 'Tier'; nameInput.value = 'Tier'; render(); save(); }
    });
    nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') closePopover(); });

    const actions = h('div', 'pop-actions');
    const mk = (text, cls, fn, disabled) => {
      const b = h('button', `btn ${cls}`, { type: 'button' });
      b.textContent = text;
      b.disabled = !!disabled;
      b.addEventListener('click', fn);
      actions.append(b);
      return b;
    };
    const reopen = () => {
      const a = board.querySelectorAll('.icon-btn')[state.tiers.findIndex((t) => t.id === tierId)];
      if (a) openPopover(tierId, a);
    };
    mk('Move up', 'btn-ghost', () => {
      const i = state.tiers.indexOf(tier);
      state.tiers.splice(i, 1); state.tiers.splice(i - 1, 0, tier);
      commit(); reopen();
    }, index === 0);
    mk('Move down', 'btn-ghost', () => {
      const i = state.tiers.indexOf(tier);
      state.tiers.splice(i, 1); state.tiers.splice(i + 1, 0, tier);
      commit(); reopen();
    }, index === state.tiers.length - 1);
    mk('Clear row', 'btn-ghost', () => {
      const n = tier.items.length;
      state.tray.push(...tier.items);
      tier.items = [];
      commit(); closePopover();
      toast(`Moved ${n} ${n === 1 ? 'game' : 'games'} to Unranked`);
    }, tier.items.length === 0);
    mk('Delete tier', 'btn-ghost btn-delete', () => {
      const n = tier.items.length;
      state.tray.push(...tier.items);
      state.tiers.splice(state.tiers.indexOf(tier), 1);
      commit(); closePopover();
      toast(n ? `Deleted tier ${tier.label}. ${n} ${n === 1 ? 'game' : 'games'} moved to Unranked` : `Deleted tier ${tier.label}`);
    }, state.tiers.length <= 1);

    popover.replaceChildren(nameField, colorField, actions);
    popover.hidden = false;
    positionPopover(anchor);
    nameInput.focus();
    nameInput.select();
  }

  function positionPopover(anchor) {
    const r = anchor.getBoundingClientRect();
    const pw = popover.offsetWidth;
    const ph = popover.offsetHeight;
    let left = r.right - pw;
    let top = r.bottom + 6;
    left = clamp(left, 8, window.innerWidth - pw - 8);
    if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 6);
    popover.style.left = left + 'px';
    popover.style.top = top + 'px';
  }

  function closePopover() {
    if (popover.hidden) return;
    popover.hidden = true;
    if (popAnchor) popAnchor.setAttribute('aria-expanded', 'false');
    popTier = null; popAnchor = null;
  }

  document.addEventListener('pointerdown', (e) => {
    if (!popover.hidden && !popover.contains(e.target) && !e.target.closest('.icon-btn')) closePopover();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !popover.hidden) {
      const a = popAnchor;
      closePopover();
      a && a.isConnected && a.focus();
    }
  });
  window.addEventListener('resize', () => { if (!popover.hidden && popAnchor) positionPopover(popAnchor); });

  /* ------------------------------------------------------------------ */
  /* Image import                                                        */
  /* ------------------------------------------------------------------ */

  const MAX_SIDE = 480;

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not read image'));
      img.src = url;
    });
  }

  /* Duplicate detection.
     hash: fingerprint of the exact file bytes (catches the same file added twice).
     dh:   64-bit "difference hash" of the picture (catches the same artwork that was
           resized, re-saved or re-encoded, e.g. dragged in from a web page). */

  async function hashBytes(blob) {
    const buf = await blob.arrayBuffer();
    try {
      const digest = await crypto.subtle.digest('SHA-256', buf);
      return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // crypto.subtle is unavailable on insecure origins; fall back to a 53-bit hash.
      let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++) {
        h1 = Math.imul(h1 ^ bytes[i], 2654435761);
        h2 = Math.imul(h2 ^ bytes[i], 1597334677);
      }
      h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
      h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
      return 'f' + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
    }
  }

  function diffHash(img) {
    const c = document.createElement('canvas');
    c.width = 9; c.height = 8;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#fff'; g.fillRect(0, 0, 9, 8); // flatten transparency
    g.drawImage(img, 0, 0, 9, 8);
    const px = g.getImageData(0, 0, 9, 8).data;
    const gray = (x, y) => { const i = (y * 9 + x) * 4; return px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114; };
    let bits = '';
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += gray(x, y) > gray(x + 1, y) ? '1' : '0';
    return bits;
  }

  const hamming = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++; return d; };

  // Items saved before duplicate detection existed have no fingerprint yet; derive it from the stored image.
  async function ensureFingerprint(item) {
    if (item.dh) return;
    try { item.dh = diffHash(await loadImage(item.src)); } catch { /* leave unfingerprinted */ }
  }

  function findDuplicate(candidate) {
    return Object.values(state.items).find((o) =>
      (o.hash && candidate.hash && o.hash === candidate.hash) ||
      (o.dh && candidate.dh && Math.abs(o.ar - candidate.ar) < 0.05 && hamming(o.dh, candidate.dh) <= 3));
  }

  async function fileToItem(file) {
    const url = URL.createObjectURL(file);
    try {
      const hash = await hashBytes(file);
      const img = await loadImage(url);
      const dh = diffHash(img);
      const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const hgt = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = hgt;
      canvas.getContext('2d').drawImage(img, 0, 0, w, hgt);
      let src = canvas.toDataURL('image/webp', 0.86);
      if (!src.startsWith('data:image/webp')) src = canvas.toDataURL('image/jpeg', 0.88);
      const name = (file.name || 'Pasted image').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Untitled';
      return { id: uid(), name: titleCaseName(name).slice(0, 60), src, ar: clamp(img.naturalWidth / img.naturalHeight, 0.6, 1.6), hash, dh };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // Adds images to Unranked (skipping duplicates) without re-rendering; returns what happened.
  async function importFiles(files) {
    await Promise.all(Object.values(state.items).map(ensureFingerprint));
    const added = [];
    let skipped = 0, failed = 0, done = 0;
    for (const f of files) {
      if (files.length > 12 && done % 5 === 0) toast(`Adding images… ${done} of ${files.length}`, { duration: 20000 });
      done++;
      try {
        const item = await fileToItem(f);
        if (findDuplicate(item)) { skipped++; continue; }
        state.items[item.id] = item;
        state.tray.push(item.id);
        added.push(item.id);
      } catch { failed++; }
    }
    return { added, skipped, failed };
  }

  async function addFiles(fileList) {
    const files = [...fileList].filter((f) => f.type.startsWith('image/'));
    if (!files.length) { toast('Those files aren’t images. Try PNG, JPG or WebP.'); return; }
    const result = await importFiles(files);
    const added = result.added.length, { skipped, failed } = result;
    if (added) { commit(); fxFlyIn(result.added); } else save();

    const plural = (n) => (n === 1 ? 'image' : 'images');
    if (added && skipped) toast(`Added ${added} ${plural(added)}. Skipped ${skipped} already in your list.`);
    else if (added) toast(`Added ${added} ${plural(added)} to Unranked`);
    else if (skipped) toast(skipped === 1 && files.length === 1 ? 'That image is already in your list.' : `Skipped ${skipped} ${plural(skipped)} already in your list.`);
    else if (failed) toast('Couldn’t read those images.');
  }

  /* Sample games: made-up box art with silly names, bundled in sample/samples.js
     (a script rather than loose files, so it also works when index.html is opened straight from disk). */
  function dataUrlToFile(item) {
    const [head, b64] = item.src.split(',');
    const type = (head.match(/data:([^;]+)/) || [])[1] || 'image/png';
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new File([bytes], item.name, { type });
  }

  async function loadSamples() {
    if (!Array.isArray(window.TOPSHELF_SAMPLES)) {
      try {
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = 'sample/samples.js';
          s.onload = res; s.onerror = rej;
          document.head.append(s);
        });
      } catch { /* handled below */ }
    }
    if (!Array.isArray(window.TOPSHELF_SAMPLES) || !window.TOPSHELF_SAMPLES.length) {
      toast('This copy has no sample games. Drop in your own box art instead.');
      return;
    }
    await addFiles(window.TOPSHELF_SAMPLES.map(dataUrlToFile));
  }
  $('#sampleBtn').addEventListener('click', loadSamples);

  $('#addImagesBtn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => { addFiles(fileInput.files); fileInput.value = ''; });

  // Drag files in from the desktop
  const overlay = $('#dropOverlay');
  let fileDragDepth = 0;
  const hasFiles = (e) => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
  window.addEventListener('dragenter', (e) => { if (hasFiles(e)) { fileDragDepth++; overlay.hidden = false; } });
  window.addEventListener('dragleave', (e) => { if (hasFiles(e) && --fileDragDepth <= 0) { fileDragDepth = 0; overlay.hidden = true; } });
  window.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
  window.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    fileDragDepth = 0; overlay.hidden = true;
    addFiles(e.dataTransfer.files);
  });

  // Paste from clipboard
  window.addEventListener('paste', (e) => {
    if (e.target.closest && e.target.closest('input, textarea, [contenteditable="true"]')) return;
    const files = [...(e.clipboardData ? e.clipboardData.files : [])].filter((f) => f.type.startsWith('image/'));
    if (files.length) { e.preventDefault(); addFiles(files); }
  });

  /* ------------------------------------------------------------------ */
  /* Toolbar                                                             */
  /* ------------------------------------------------------------------ */

  titleInput.addEventListener('input', () => {
    state.title = titleInput.value;
    document.title = `${state.title || 'Tier list'} — Top Shelf`;
    save();
  });
  titleInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') titleInput.blur(); });

  document.querySelectorAll('.segmented button').forEach((b) =>
    b.addEventListener('click', () => { state.size = b.dataset.size; render(); save(); }));

  $('#namesToggle').addEventListener('click', () => { state.names = !state.names; render(); save(); });

  $('#addTierBtn').addEventListener('click', () => {
    const last = state.tiers[state.tiers.length - 1];
    const next = last && /^[A-Y]$/.test(last.label) ? String.fromCharCode(last.label.charCodeAt(0) + 1) : `Tier ${state.tiers.length + 1}`;
    const color = TIER_COLORS[state.tiers.length % TIER_COLORS.length];
    const tier = { id: uid(), label: next, color, items: [] };
    state.tiers.push(tier);
    commit();
    const gear = board.querySelector(`.tier[data-tier="${tier.id}"] .icon-btn`);
    if (gear) gear.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  async function resetList() {
    const ok = await confirmDialog({
      title: 'Reset this tier list?',
      text: 'This removes every image in this list and restores the default S to E tiers. Your other lists are not affected. You can’t undo this.',
      ok: 'Reset list',
    });
    if (!ok) return;
    const keep = { id: state.id, title: state.title };
    state = Object.assign(defaultState(), keep);
    closePopover();
    commit();
    toast('Tier list reset');
  }

  /* ------------------------------------------------------------------ */
  /* Export to PNG (drawn directly to a canvas)                          */
  /* ------------------------------------------------------------------ */

  function roundRect(ctx, x, y, w, hgt, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + hgt, r);
    ctx.arcTo(x + w, y + hgt, x, y + hgt, r);
    ctx.arcTo(x, y + hgt, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Draws the board and resolves to a PNG blob (or null when there is nothing to export).
  async function renderPng() {
    if (!state.tiers.some((t) => t.items.length)) { toast('Rank at least one game before exporting.'); return null; }

    const P = themeById(document.documentElement.dataset.theme).png;

    try { await document.fonts.ready; } catch { /* ignore */ }
    const used = new Set(state.tiers.flatMap((t) => t.items));
    if (used.size > 60) { toast('Creating your image…', { duration: 20000 }); await new Promise((r) => setTimeout(r, 60)); }
    const images = {};
    await Promise.all([...used].map(async (id) => { images[id] = await loadImage(state.items[id].src); }));

    const W = 1600, SCALE = 2;
    const TH = 150, GAP = 8, PAD = 12, LABEL_W = 150;
    const titleH = state.title.trim() ? 92 : 24;
    const footerH = 44;
    const ROW_MIN = TH + PAD * 2;

    // Layout pass: same "max 2 rows per tier, shrink to fit" rule as the on-screen board
    const availW = W - LABEL_W - PAD * 2;
    const rows = state.tiers.map((t) => {
      const th = fitTileHeight(t.items.map((id) => state.items[id].ar), availW, GAP, TH, 28);
      let x = LABEL_W + PAD, y = PAD, lines = 1;
      const placed = t.items.map((id) => {
        const w = Math.ceil(th * state.items[id].ar);
        if (x + w > W - PAD && x > LABEL_W + PAD) { x = LABEL_W + PAD; y += th + GAP; lines++; }
        const p = { id, x, y, w };
        x += w + GAP;
        return p;
      });
      return { tier: t, placed, th, height: Math.max(ROW_MIN, lines * th + (lines - 1) * GAP + PAD * 2) };
    });
    const H = titleH + rows.reduce((s, r) => s + r.height, 0) + footerH;

    const canvas = document.createElement('canvas');
    canvas.width = W * SCALE; canvas.height = H * SCALE;
    const ctx = canvas.getContext('2d');
    ctx.scale(SCALE, SCALE);

    const display = '"Bricolage Grotesque", "Segoe UI", system-ui, sans-serif';
    const ui = '"Instrument Sans", "Segoe UI", system-ui, sans-serif';

    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);

    if (state.title.trim()) {
      ctx.fillStyle = P.title;
      ctx.font = `700 44px ${display}`;
      ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      ctx.fillText(state.title.trim(), PAD + 8, titleH / 2 + 4, W - PAD * 2 - 16);
    }

    let y = titleH;
    rows.forEach((row, ri) => {
      ctx.fillStyle = P.row; ctx.fillRect(0, y, W, row.height);
      ctx.fillStyle = row.tier.color; ctx.fillRect(0, y, LABEL_W, row.height);
      const lg = ctx.createLinearGradient(0, y, 0, y + row.height);
      lg.addColorStop(0, 'rgba(255,255,255,.16)'); lg.addColorStop(1, 'rgba(0,0,0,.10)');
      ctx.fillStyle = lg; ctx.fillRect(0, y, LABEL_W, row.height);

      ctx.fillStyle = inkFor(row.tier.color);
      const len = row.tier.label.length;
      const fs = len <= 2 ? 64 : len <= 4 ? 40 : 26;
      ctx.font = `800 ${fs}px ${display}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      wrapCenter(ctx, row.tier.label, LABEL_W / 2, y + row.height / 2, LABEL_W - 24, fs * 1.1);

      const th = row.th;
      row.placed.forEach((p) => {
        const px = p.x, py = y + p.y;
        ctx.save();
        ctx.shadowColor = P.shadow; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
        roundRect(ctx, px, py, p.w, th, 6);
        ctx.fillStyle = P.tile; ctx.fill();
        ctx.restore();
        ctx.save();
        roundRect(ctx, px, py, p.w, th, 6); ctx.clip();
        coverDraw(ctx, images[p.id], px, py, p.w, th);
        if (state.names && th >= 90) {
          const g = ctx.createLinearGradient(0, py + th - 46, 0, py + th);
          g.addColorStop(0, 'rgba(8,10,14,0)'); g.addColorStop(1, 'rgba(8,10,14,.9)');
          ctx.fillStyle = g; ctx.fillRect(px, py + th - 46, p.w, 46);
          ctx.fillStyle = '#fff'; ctx.font = `600 14px ${ui}`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
          const name = fitText(ctx, state.items[p.id].name, p.w - 12);
          ctx.fillText(name, px + p.w / 2, py + th - 9);
        }
        ctx.restore();
        ctx.save();
        roundRect(ctx, px + 0.5, py + 0.5, p.w - 1, th - 1, 6);
        ctx.strokeStyle = P.ring; ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();
      });

      if (ri < rows.length - 1) { ctx.fillStyle = P.line; ctx.fillRect(0, y + row.height - 1, W, 1); }
      y += row.height;
    });

    ctx.fillStyle = P.muted; ctx.font = `500 15px ${ui}`;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText('Made with Top Shelf', W - PAD - 4, H - footerH / 2);

    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'));
  }

  const fileSlug = () => (state.title || 'tier-list').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tier-list';

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = h('a', '', { href: url, download: filename });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  async function exportPng() {
    const blob = await renderPng();
    if (!blob) return;
    downloadBlob(blob, `${fileSlug()}.png`);
    toast('Exported as PNG');
  }

  async function copyPng() {
    if (!(navigator.clipboard && window.ClipboardItem)) { toast('Your browser can’t copy images. Use Export PNG instead.'); return; }
    // Safari only allows the clipboard write if it starts synchronously, so hand it the pending blob.
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': renderPng().then((b) => { if (!b) throw new Error('empty'); return b; }) })]);
      toast('Image copied. Paste it into a chat or document.');
    } catch (err) {
      if (err && err.message === 'empty') return;
      toast('Couldn’t copy the image. Use Export PNG instead.');
    }
  }

  async function sharePng() {
    const blob = await renderPng();
    if (!blob) return;
    const file = new File([blob], `${fileSlug()}.png`, { type: 'image/png' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: state.title });
      } else {
        downloadBlob(blob, file.name);
        toast('Sharing isn’t available here, so the image was downloaded.');
      }
    } catch (err) {
      if (err && err.name !== 'AbortError') toast('Couldn’t share the image.');
    }
  }

  function coverDraw(ctx, img, x, y, w, hgt) {
    const ir = img.naturalWidth / img.naturalHeight, br = w / hgt;
    let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0;
    if (ir > br) { sw = sh * br; sx = (img.naturalWidth - sw) / 2; } else { sh = sw / br; sy = (img.naturalHeight - sh) / 2; }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, hgt);
  }

  function fitText(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    return t.trimEnd() + '…';
  }

  function wrapCenter(ctx, text, cx, cy, maxW, lineH) {
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const next = cur ? cur + ' ' + w : w;
      if (ctx.measureText(next).width > maxW && cur) { lines.push(cur); cur = w; } else cur = next;
    }
    lines.push(cur);
    const top = cy - ((lines.length - 1) * lineH) / 2;
    lines.forEach((l, i) => ctx.fillText(l, cx, top + i * lineH, maxW));
  }

  $('#exportBtn').addEventListener('click', exportPng);

  /* ------------------------------------------------------------------ */
  /* Dropdown menu                                                       */
  /* ------------------------------------------------------------------ */

  const menuEl = $('#menu');
  let menuAnchor = null;

  /* items: { label, sub, icon, onClick, disabled, danger, checked, separator, heading, trail: { icon, label, onClick } } */
  function openMenu(anchor, items, { align = 'right', tall = false } = {}) {
    if (menuAnchor === anchor && !menuEl.hidden) { closeMenu(); return; }
    closeMenu();
    closePopover();
    hideZoom();
    menuAnchor = anchor;
    anchor.setAttribute('aria-expanded', 'true');

    const nodes = items.map((it) => {
      if (it.separator) return h('div', 'menu-sep', { role: 'separator' });
      if (it.heading) { const d = h('div', 'menu-heading'); d.textContent = it.heading; return d; }

      const btn = h('button', 'menu-item' + (it.danger ? ' is-danger' : ''), { type: 'button', role: it.checked != null ? 'menuitemradio' : 'menuitem' });
      if (it.checked != null) btn.setAttribute('aria-checked', String(!!it.checked));
      if (it.disabled) btn.disabled = true;
      btn.innerHTML = it.checked != null ? ICON.check.replace('<svg ', '<svg class="menu-check" ').replace('aria-hidden="true"', `aria-hidden="true" style="visibility:${it.checked ? 'visible' : 'hidden'}"`) : (it.icon || '');
      if (it.swatch) { const sw = h('span', 'menu-swatch'); sw.style.background = `linear-gradient(135deg, ${it.swatch[0]} 50%, ${it.swatch[1]} 50%)`; btn.append(sw); }
      const label = h('span', 'menu-label'); label.textContent = it.label;
      btn.append(label);
      if (it.sub) { const s = h('span', 'menu-sub'); s.textContent = it.sub; btn.append(s); }
      btn.addEventListener('click', () => { closeMenu(); it.onClick && it.onClick(); });

      if (!it.trail) return btn;
      const row = h('div', 'menu-row');
      const trail = h('button', 'menu-trail', { type: 'button', 'aria-label': it.trail.label, title: it.trail.label });
      trail.innerHTML = it.trail.icon;
      trail.addEventListener('click', () => { closeMenu(); it.trail.onClick(); });
      row.append(btn, trail);
      return row;
    });

    menuEl.replaceChildren(...nodes);
    menuEl.classList.toggle('menu-tall', tall);
    menuEl.hidden = false;
    const r = anchor.getBoundingClientRect();
    const mw = menuEl.offsetWidth, mh = menuEl.offsetHeight;
    let left = align === 'left' ? r.left : r.right - mw;
    left = clamp(left, 8, window.innerWidth - mw - 8);
    let top = r.bottom + 6;
    if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 6);
    menuEl.style.left = left + 'px';
    menuEl.style.top = top + 'px';
    const first = menuEl.querySelector('.menu-item:not(:disabled)');
    if (first) first.focus({ preventScroll: true });
  }

  function closeMenu() {
    if (menuEl.hidden) return;
    menuEl.hidden = true;
    if (menuAnchor) { menuAnchor.setAttribute('aria-expanded', 'false'); }
    menuAnchor = null;
  }

  document.addEventListener('pointerdown', (e) => {
    if (!menuEl.hidden && !menuEl.contains(e.target) && !(menuAnchor && menuAnchor.contains(e.target))) closeMenu();
  });
  window.addEventListener('keydown', (e) => {
    if (menuEl.hidden) return;
    if (e.key === 'Escape') { const a = menuAnchor; closeMenu(); a && a.focus(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const items = [...menuEl.querySelectorAll('.menu-item:not(:disabled)')];
      if (!items.length) return;
      const i = items.indexOf(document.activeElement);
      const next = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
      items[next].focus();
    }
  });
  window.addEventListener('resize', closeMenu);

  /* ------------------------------------------------------------------ */
  /* Multiple lists                                                      */
  /* ------------------------------------------------------------------ */

  async function switchList(id) {
    if (id === state.id) return;
    await flushSave();
    let raw;
    try { raw = await storeGet(listKey(id)); } catch { raw = null; }
    if (!raw) { toast('That list couldn’t be opened.'); return; }
    state = sanitize(raw);
    state.id = id;
    meta.active = id;
    closePopover();
    render();
    try { await storeSet(META_KEY, meta); } catch { /* ignore */ }
  }

  function nextListTitle() {
    const used = new Set(meta.order.map((id) => (meta.index[id] || {}).title));
    for (let n = meta.order.length + 1; ; n++) { const t = `Tier list ${n}`; if (!used.has(t)) return t; }
  }

  async function adoptList(newState) {
    await flushSave();
    state = newState;
    if (!meta.order.includes(state.id)) meta.order.push(state.id);
    meta.active = state.id;
    meta.index[state.id] = { title: state.title, count: gameCount(state) };
    closePopover();
    render();
    await writeNow();
  }

  const newList = () => adoptList(defaultState(nextListTitle())).then(() => { titleInput.focus(); titleInput.select(); });

  function duplicateList() {
    const copy = sanitize(JSON.parse(JSON.stringify(state)));
    copy.id = uid();
    copy.title = `${state.title} copy`.slice(0, 80);
    return adoptList(copy).then(() => toast('Duplicated this list'));
  }

  async function deleteList(id) {
    const info = meta.index[id] || { title: 'this list' };
    const ok = await confirmDialog({
      title: `Delete “${info.title}”?`,
      text: `This permanently deletes the list${info.count ? ` and its ${info.count} ${info.count === 1 ? 'game' : 'games'}` : ''}. You can’t undo this.`,
      ok: 'Delete list',
    });
    if (!ok) return;
    const wasActive = id === state.id;
    const at = meta.order.indexOf(id);
    meta.order = meta.order.filter((x) => x !== id);
    delete meta.index[id];
    try { await storeDel(listKey(id)); } catch { /* ignore */ }
    if (wasActive) {
      const next = meta.order[Math.min(at, meta.order.length - 1)];
      if (next) await switchListRaw(next); else await adoptList(defaultState());
    } else {
      try { await storeSet(META_KEY, meta); } catch { /* ignore */ }
    }
    toast('List deleted');
  }

  // Load a list without first saving the (already deleted) current one.
  async function switchListRaw(id) {
    let raw;
    try { raw = await storeGet(listKey(id)); } catch { raw = null; }
    state = sanitize(raw);
    state.id = id;
    meta.active = id;
    render();
    try { await storeSet(META_KEY, meta); } catch { /* ignore */ }
  }

  function openListsMenu() {
    syncMeta();
    const items = [{ heading: 'Your tier lists' }];
    meta.order.forEach((id) => {
      const info = meta.index[id] || { title: 'Untitled list', count: 0 };
      items.push({
        label: info.title || 'Untitled list',
        sub: `${info.count} ${info.count === 1 ? 'game' : 'games'}`,
        checked: id === state.id,
        onClick: () => switchList(id),
        trail: { icon: ICON.trash, label: `Delete ${info.title || 'list'}`, onClick: () => deleteList(id) },
      });
    });
    items.push({ separator: true });
    items.push({ label: 'New list', icon: ICON.plus, onClick: newList });
    items.push({ label: 'Duplicate this list', icon: ICON.copy, onClick: duplicateList });
    openMenu($('#listsBtn'), items, { align: 'left' });
  }
  $('#listsBtn').addEventListener('click', openListsMenu);

  /* ------------------------------------------------------------------ */
  /* Backup and import                                                   */
  /* ------------------------------------------------------------------ */

  async function backupAll() {
    await flushSave();
    const lists = [];
    try {
      for (const id of meta.order) {
        const raw = id === state.id ? state : await storeGet(listKey(id));
        if (raw) lists.push(await withEmbeddedImages(raw));
      }
    } catch { toast('Couldn’t read every picture, so the backup wasn’t created.'); return; }
    const payload = { app: 'Top Shelf', version: 1, appVersion: APP_VERSION, exportedAt: new Date().toISOString(), lists };
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    downloadBlob(blob, `top-shelf-backup-${new Date().toISOString().slice(0, 10)}.json`);
    toast(`Backed up ${lists.length} ${lists.length === 1 ? 'list' : 'lists'}`);
  }

  async function importBackup(file) {
    let payload;
    try { payload = JSON.parse(await file.text()); } catch { toast('That file isn’t a Top Shelf backup.'); return; }
    const incoming = Array.isArray(payload && payload.lists) ? payload.lists : (payload && Array.isArray(payload.tiers) ? [payload] : []);
    if (!incoming.length) { toast('That file isn’t a Top Shelf backup.'); return; }

    await flushSave();
    // On a fresh install the only list is an empty default one; replace it instead of leaving clutter.
    const replaceId = meta.order.length === 1 && gameCount(state) === 0 ? state.id : null;
    let first = null;
    for (const raw of incoming) {
      const s = sanitize(raw);
      s.id = uid(); // always import as a new list; never overwrite an existing one
      meta.order.push(s.id);
      meta.index[s.id] = { title: s.title, count: gameCount(s) };
      try { await storeSet(listKey(s.id), s); } catch { toast('Couldn’t store the imported list.'); return; }
      if (!first) first = s;
    }
    if (replaceId) {
      meta.order = meta.order.filter((x) => x !== replaceId);
      delete meta.index[replaceId];
      try { await storeDel(listKey(replaceId)); } catch { /* ignore */ }
    }
    state = first;
    meta.active = first.id;
    render();
    await writeNow();
    toast(`Imported ${incoming.length} ${incoming.length === 1 ? 'list' : 'lists'}`);
  }

  const backupInput = $('#backupInput');
  backupInput.addEventListener('change', () => { if (backupInput.files[0]) importBackup(backupInput.files[0]); backupInput.value = ''; });

  /* ------------------------------------------------------------------ */
  /* Theme                                                               */
  /* ------------------------------------------------------------------ */

  /* Each theme is a palette in styles.css (data-theme). Here: names for the picker, swatch colours, the browser
     bar colour, and the colours used when drawing the exported PNG. */
  const THEMES = [
    { id: 'dark', group: 'Classic', name: 'Dark studio', note: 'Graphite', swatch: ['#12151b', '#e2b04a'], meta: '#161a21',
      png: { bg: '#12151b', row: '#1a1e26', line: '#2c3340', title: '#e9ecf1', muted: '#8f98a8', tile: '#2a303c', shadow: 'rgba(0,0,0,.45)', ring: 'rgba(255,255,255,.10)' } },
    { id: 'light', group: 'Classic', name: 'Light paper', note: 'Clean', swatch: ['#eceff4', '#e2b04a'], meta: '#eceff4',
      png: { bg: '#eceff4', row: '#ffffff', line: '#d9dee8', title: '#151a22', muted: '#5f6b7e', tile: '#e6e9f0', shadow: 'rgba(20,26,36,.28)', ring: 'rgba(20,26,36,.14)' } },
    { id: 'war', group: 'Genres', name: 'War', note: 'Topo map', swatch: ['#1b2015', '#e0903a'], meta: '#1b2015',
      png: { bg: '#1b2015', row: '#242b1d', line: '#38442c', title: '#edf0e0', muted: '#9aa584', tile: '#38442d', shadow: 'rgba(0,0,0,.45)', ring: 'rgba(255,255,255,.10)' } },
    { id: 'horror', group: 'Genres', name: 'Horror', note: 'Eyes and mist', swatch: ['#0b0e0d', '#d62f3f'], meta: '#0b0e0d',
      png: { bg: '#0b0e0d', row: '#131a17', line: '#232f29', title: '#e8efe9', muted: '#8c9e92', tile: '#243029', shadow: 'rgba(0,0,0,.45)', ring: 'rgba(255,255,255,.10)' } },
    { id: 'scifi', group: 'Genres', name: 'Sci-fi', note: 'Starfield', swatch: ['#070b18', '#22d3ee'], meta: '#070b18',
      png: { bg: '#070b18', row: '#0e1530', line: '#1e2b5a', title: '#e8efff', muted: '#8a99c6', tile: '#1c2852', shadow: 'rgba(0,0,0,.45)', ring: 'rgba(255,255,255,.10)' } },
    { id: 'fantasy', group: 'Genres', name: 'Fantasy', note: 'Dragon scales', swatch: ['#ead7a8', '#8e2b3c'], meta: '#ead7a8',
      png: { bg: '#ead7a8', row: '#fff7e0', line: '#d9c28a', title: '#2e1a14', muted: '#80644f', tile: '#e8d3a0', shadow: 'rgba(46,26,20,.28)', ring: 'rgba(46,26,20,.14)' } },
    { id: 'solo', group: 'Genres', name: 'Solo', note: 'Lamplight', swatch: ['#181b24', '#ff9577'], meta: '#181b24',
      png: { bg: '#181b24', row: '#20242f', line: '#2f3544', title: '#eceef4', muted: '#9aa1b6', tile: '#333a4a', shadow: 'rgba(0,0,0,.45)', ring: 'rgba(255,255,255,.10)' } },
    { id: 'pirates', group: 'Genres', name: 'Pirates', note: 'Ship deck', swatch: ['#2a1b12', '#2ec4b6'], meta: '#2a1b12',
      png: { bg: '#2a1b12', row: '#37261a', line: '#53392a', title: '#f7ebd8', muted: '#b09c82', tile: '#533b2a', shadow: 'rgba(0,0,0,.45)', ring: 'rgba(255,255,255,.10)' } },
    { id: 'party', group: 'Genres', name: 'Party', note: 'Confetti', swatch: ['#ece6ff', '#e0299b'], meta: '#ece6ff',
      png: { bg: '#ece6ff', row: '#fbf9ff', line: '#d6c9fb', title: '#261448', muted: '#75699a', tile: '#e2d8ff', shadow: 'rgba(38,20,72,.28)', ring: 'rgba(38,20,72,.14)' } },
    { id: 'euro', group: 'Genres', name: 'Eurogame', note: 'Wood and cubes', swatch: ['#f1e2b6', '#3f7d3a'], meta: '#f1e2b6',
      png: { bg: '#f1e2b6', row: '#fffaea', line: '#dcc88e', title: '#2f2410', muted: '#7d683f', tile: '#ecdcab', shadow: 'rgba(47,36,16,.28)', ring: 'rgba(47,36,16,.14)' } },
    { id: 'dice', group: 'Fun', name: 'Dice night', note: 'Green felt', swatch: ['#0d2a20', '#f2c14e'], meta: '#0d2a20',
      png: { bg: '#0d2a20', row: '#143a2c', line: '#2b6049', title: '#eaf6ee', muted: '#93b4a0', tile: '#225540', shadow: 'rgba(0,0,0,.45)', ring: 'rgba(255,255,255,.12)' } },
    { id: 'meeple', group: 'Fun', name: 'Meeple party', note: 'Playful', swatch: ['#fff1d0', '#ff5d8f'], meta: '#fff1d0',
      png: { bg: '#fff1d0', row: '#fffaf0', line: '#ecd8aa', title: '#2b2140', muted: '#766a8c', tile: '#f7e6c0', shadow: 'rgba(43,33,64,.28)', ring: 'rgba(43,33,64,.14)' } },
    { id: 'dungeon', group: 'Fun', name: 'Dungeon crawl', note: 'Hex map', swatch: ['#0c0916', '#a78bfa'], meta: '#0c0916',
      png: { bg: '#0c0916', row: '#161127', line: '#2e2550', title: '#ece8fa', muted: '#9a92bd', tile: '#281f47', shadow: 'rgba(0,0,0,.5)', ring: 'rgba(255,255,255,.10)' } },
    { id: 'cards', group: 'Game mechanics', name: 'Card table', note: 'Trick-taking', swatch: ['#0e1830', '#f1e6c8'], meta: '#0e1830',
      png: { bg: '#0e1830', row: '#14213f', line: '#2a3d70', title: '#eef2fb', muted: '#94a3c6', tile: '#223562', shadow: 'rgba(0,0,0,.45)', ring: 'rgba(255,255,255,.12)' } },
    { id: 'hex', group: 'Game mechanics', name: 'Hex trader', note: 'Tiles and trade', swatch: ['#0f3a4c', '#ffa940'], meta: '#0f3a4c',
      png: { bg: '#0f3a4c', row: '#15485e', line: '#2c7391', title: '#eaf7fb', muted: '#92bac9', tile: '#24647f', shadow: 'rgba(0,0,0,.45)', ring: 'rgba(255,255,255,.12)' } },
    { id: 'chips', group: 'Game mechanics', name: 'Chip stack', note: 'Betting', swatch: ['#140b0e', '#ff4d5e'], meta: '#140b0e',
      png: { bg: '#140b0e', row: '#20131a', line: '#3d2630', title: '#f6ecee', muted: '#a99299', tile: '#38242e', shadow: 'rgba(0,0,0,.5)', ring: 'rgba(255,255,255,.10)' } },
    { id: 'chess', group: 'Game mechanics', name: 'Chess club', note: 'Abstract', swatch: ['#f0e4cc', '#8a5a2b'], meta: '#f0e4cc',
      png: { bg: '#f0e4cc', row: '#fffaf0', line: '#dcc9a2', title: '#2a1c10', muted: '#78644c', tile: '#ead9b8', shadow: 'rgba(42,28,16,.28)', ring: 'rgba(42,28,16,.14)' } },
    { id: 'coop', group: 'Game mechanics', name: 'Co-op map', note: 'Cooperative', swatch: ['#08171d', '#3ddc97'], meta: '#08171d',
      png: { bg: '#08171d', row: '#0f2229', line: '#1f414d', title: '#e6f4f6', muted: '#88acb4', tile: '#1d3b46', shadow: 'rgba(0,0,0,.5)', ring: 'rgba(255,255,255,.10)' } },
  ];
  const themeById = (id) => THEMES.find((t) => t.id === id) || THEMES[0];

  const themeBtn = $('#themeBtn');
  const currentTheme = () => themeById(document.documentElement.dataset.theme).id;

  function applyTheme(id, persist) {
    const t = themeById(id);
    document.documentElement.dataset.theme = t.id;
    if (persist) saveSettings();
    themeBtn.innerHTML = ICON.palette;
    themeBtn.setAttribute('aria-label', `Theme: ${t.name}`);
    themeBtn.title = `Theme: ${t.name}. Click to change`;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute('content', t.meta);
  }

  function openThemeMenu(anchor) {
    const cur = currentTheme();
    openMenu(anchor, [
      ...THEMES.flatMap((t, i) => [
        ...(i === 0 || THEMES[i - 1].group !== t.group ? [...(i ? [{ separator: true }] : []), { heading: t.group }] : []),
        { label: t.name, sub: t.note, swatch: t.swatch, checked: t.id === cur, onClick: () => { applyTheme(t.id, true); toast(`${t.name} theme`); } },
      ]),
    ], { tall: true });
  }
  themeBtn.addEventListener('click', () => openThemeMenu(themeBtn));
  applyTheme(currentTheme(), false);

  /* Hover preview on/off (saved in lists/settings.json; on by default) */
  const previewBtn = $('#previewBtn');

  function applyPreview(on, persist) {
    if (on) document.documentElement.removeAttribute('data-preview');
    else document.documentElement.dataset.preview = 'off';
    if (persist) saveSettings();
    previewBtn.innerHTML = on ? ICON.eye : ICON.eyeOff;
    previewBtn.setAttribute('aria-pressed', String(on));
    previewBtn.title = on ? 'Hover preview: on. Click to turn off' : 'Hover preview: off. Click to turn on';
    if (!on) { clearTimeout(zoomTimer); zoomEl.classList.remove('is-visible', 'is-open'); zoomScrim.classList.remove('is-visible'); document.body.classList.remove('zoom-active'); document.querySelectorAll('.zoom-target').forEach((t) => t.classList.remove('zoom-target')); }
  }
  previewBtn.addEventListener('click', () => {
    const next = !previewEnabled();
    applyPreview(next, true);
    toast(next ? 'Hover preview on' : 'Hover preview off. Hover a tile and press a number to rank it.');
  });
  applyPreview(previewEnabled(), false);

  /* ------------------------------------------------------------------ */
  /* Quick-rank dialog                                                   */
  /* ------------------------------------------------------------------ */

  const quickDialog = $('#quickDialog');
  let quickId = null;

  function openQuick(id) {
    const item = state.items[id];
    if (!item) return;
    quickId = id;
    // If the hover preview was open, every other tile is blurred; un-blurring 50+ tiles with a transition
    // is what made the first frames of the fly-out stutter. Drop them all in one frame instead.
    document.body.classList.add('quick-opening');
    hideZoom();
    setTimeout(() => document.body.classList.remove('quick-opening'), 500);
    $('#quickImg').src = item.src;
    $('#quickImg').alt = item.name;
    renderQuick();
    const tile = tileById(id);
    const from = !quickDialog.open && fxActive() && tile ? fxVisibleRect(tile) : null;
    if (from) quickDialog.classList.add('is-flying');
    if (!quickDialog.open) quickDialog.showModal();
    const cur = quickDialog.querySelector('.quick-tier[aria-pressed="true"]') || quickDialog.querySelector('.quick-tier');
    if (cur) cur.focus({ preventScroll: true });
    if (from) fxFlyOut(id, from);
  }

  function renderQuick() {
    const item = state.items[quickId];
    if (!item) return;
    const zone = zoneOfItem(quickId);
    const tier = state.tiers.find((t) => t.id === zone);
    $('#quickName').textContent = item.name;
    $('#quickWhere').textContent = tier ? `Currently in tier ${tier.label}` : 'Currently unranked';
    $('#quickUnrank').disabled = !tier;

    const wrap = $('#quickTiers');
    wrap.replaceChildren(...state.tiers.map((t, i) => {
      const b = h('button', 'quick-tier', { type: 'button', 'aria-pressed': String(t.id === zone), 'aria-label': `Tier ${t.label}` });
      b.style.setProperty('--tier-color', t.color);
      b.style.setProperty('--tier-ink', inkFor(t.color));
      b.dataset.len = labelLen(t.label);
      b.dataset.tier = t.id;
      b.textContent = t.label;
      if (i < 9) { const k = h('kbd'); k.textContent = i + 1; b.append(k); }
      return b;
    }));
  }

  quickDialog.addEventListener('click', (e) => {
    if (e.target === quickDialog) { closeQuick(); return; } // click on the backdrop
    const t = e.target.closest('.quick-tier');
    if (t) { const id = quickId; quickDialog.close(); rankItem(id, t.dataset.tier); }
  });
  $('#quickClose').addEventListener('click', closeQuick);
  quickDialog.addEventListener('cancel', (e) => { if (fxActive() && quickDialog.open) { e.preventDefault(); closeQuick(); } });   // Esc
  $('#quickUnrank').addEventListener('click', () => { const id = quickId; quickDialog.close(); rankItem(id, 'tray'); });
  $('#quickRename').addEventListener('click', () => { const id = quickId; quickDialog.close(); openRename(id); });
  quickDialog.addEventListener('keydown', (e) => {
    if (!/^[0-9]$/.test(e.key) || e.metaKey || e.ctrlKey || e.altKey) return;
    const n = Number(e.key);
    const target = n === 0 ? 'tray' : state.tiers[n - 1] && state.tiers[n - 1].id;
    if (!target) return;
    e.preventDefault();
    const id = quickId;
    quickDialog.close();
    rankItem(id, target);
  });
  quickDialog.addEventListener('close', () => { quickId = null; fxEndFlyOut(true); });

  /* ------------------------------------------------------------------ */
  /* Help and About                                                      */
  /* ------------------------------------------------------------------ */

  const helpDialog = $('#helpDialog');
  const helpTabs = [...helpDialog.querySelectorAll('[role="tab"]')];

  document.querySelectorAll('.js-version').forEach((el) => { el.textContent = `v${APP_VERSION}`; });
  $('#aboutDate').textContent = new Date(`${APP_RELEASED}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  function selectHelpTab(name) {
    helpTabs.forEach((t) => {
      const on = t.dataset.tab === name;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    helpDialog.querySelector('.help-body').scrollTop = 0;
  }

  function aboutSavingText() {
    if (storeMode === 'folder') return `Your folder “${folderLabel}”`;
    if (storeMode === 'memory') return 'Not saved yet. Choose a folder under ⋯.';
    return '…';
  }

  function openHelp(tab = 'howto') {
    hideZoom();
    closeMenu();
    $('#aboutSaving').textContent = aboutSavingText();
    selectHelpTab(tab);
    if (!helpDialog.open) helpDialog.showModal();
    (helpTabs.find((t) => t.dataset.tab === tab) || helpTabs[0]).focus({ preventScroll: true });
  }

  helpTabs.forEach((t) => t.addEventListener('click', () => selectHelpTab(t.dataset.tab)));
  helpDialog.querySelector('.help-tabs').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const cur = helpTabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? helpTabs.length - 1 : (cur + (e.key === 'ArrowRight' ? 1 : -1) + helpTabs.length) % helpTabs.length;
    selectHelpTab(helpTabs[next].dataset.tab);
    helpTabs[next].focus();
  });
  $('#helpClose').addEventListener('click', () => helpDialog.close());
  helpDialog.addEventListener('click', (e) => { if (e.target === helpDialog) helpDialog.close(); });   // click on the backdrop
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-help]');
    if (b) openHelp(b.dataset.help);
  });
  // "?" opens the help from anywhere, unless you are typing or another dialog is open.
  document.addEventListener('keydown', (e) => {
    if (e.key !== '?' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (document.querySelector('dialog[open]')) return;
    e.preventDefault();
    openHelp('howto');
  });

  /* ------------------------------------------------------------------ */
  /* Toolbar menus                                                       */
  /* ------------------------------------------------------------------ */

  $('#exportMenuBtn').addEventListener('click', () => {
    const canShare = typeof navigator.share === 'function';
    openMenu($('#exportMenuBtn'), [
      { label: 'Download PNG', icon: ICON.download, onClick: exportPng },
      { label: 'Copy image', icon: ICON.copy, onClick: copyPng },
      ...(canShare ? [{ label: 'Share…', icon: ICON.share, onClick: sharePng }] : []),
    ]);
  });

  const fxBtn = $('#fxBtn');
  function syncFxBtn() {
    fxBtn.innerHTML = fxOn ? ICON.movie : ICON.movieOff;
    fxBtn.setAttribute('aria-pressed', String(fxOn));
    fxBtn.title = reducedMotion.matches ? 'Cinematic effect: paused by your reduced-motion setting'
      : fxOn ? 'Cinematic effect: on. Click to turn off' : 'Cinematic effect: off. Click to turn on';
  }

  function toggleFx() {
    fxOn = !fxOn;
    saveSettings();
    syncFxBtn();
    toast(fxOn ? 'Cinematic effect on' : 'Cinematic effect off');
  }

  fxBtn.addEventListener('click', toggleFx);
  syncFxBtn();

  function toggleFxSound() {
    fxSound = !fxSound;
    saveSettings();
    if (fxSound) { playThud(0.6); toast('Cinematic sounds on'); } else toast('Cinematic sounds off');
  }

  $('#moreBtn').addEventListener('click', () => {
    openMenu($('#moreBtn'), [
      { heading: 'This list' },
      { label: 'Reset list…', icon: ICON.reset, danger: true, onClick: resetList },
      { separator: true },
      { heading: 'Help' },
      { label: 'How to use', icon: ICON.help, sub: '?', onClick: () => openHelp('howto') },
      { label: 'About Top Shelf', icon: ICON.info, sub: `v${APP_VERSION}`, onClick: () => openHelp('about') },
      { separator: true },
      { heading: 'Your data' },
      { label: 'Back up all lists', icon: ICON.backup, sub: 'Download', onClick: backupAll },
      { label: 'Import backup…', icon: ICON.import, onClick: () => backupInput.click() },
      ...(storeMode === 'folder' ? [{ label: 'Save folder', sub: folderLabel, icon: ICON.folder, onClick: chooseFolderNow }] : []),
      ...(storeMode === 'memory' && FOLDER_SUPPORTED ? [{ label: 'Choose a save folder…', icon: ICON.folder, onClick: chooseFolderNow }] : []),
      { separator: true },
      { label: 'Theme', icon: ICON.palette, sub: themeById(currentTheme()).name, onClick: () => setTimeout(() => openThemeMenu($('#moreBtn')), 0) },
      { label: 'Cinematic effect', icon: ICON.movie, checked: fxOn, sub: reducedMotion.matches ? 'Paused: reduced motion' : (fxOn ? 'On' : 'Off'), onClick: toggleFx },
      { label: 'Cinematic sounds', icon: fxSound ? ICON.soundOn : ICON.soundOff, checked: fxSound, sub: fxSound ? 'On' : 'Off', onClick: toggleFxSound },
      { label: previewEnabled() ? 'Turn off hover preview' : 'Turn on hover preview', icon: previewEnabled() ? ICON.eyeOff : ICON.eye, onClick: () => previewBtn.click() },
    ]);
  });

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */

  /* Ask where to save (File System Access API). Resolves true once a folder is attached, false for "use without saving". */
  const folderDialog = $('#folderDialog');

  function folderGate() {
    return new Promise((resolve) => {
      let done = false;
      const finish = (ok) => { if (done) return; done = true; if (folderDialog.open) folderDialog.close(); resolve(ok); };
      const err = $('#folderError');
      const showErr = (msg) => { err.textContent = msg; err.hidden = !msg; };
      const cont = $('#folderContinue');
      const choose = $('#folderChoose');

      const pickNew = async () => {
        showErr('');
        let picked;
        try { picked = await window.showDirectoryPicker({ id: 'topshelf', mode: 'readwrite' }); }
        catch (e) { if (!e || e.name !== 'AbortError') showErr('Couldn’t open that folder. Please try another one.'); return; }
        try { await attachFolder(picked); } catch { showErr('Top Shelf couldn’t write to that folder. Please pick another one.'); return; }
        await rememberFolder(picked);
        finish(true);
      };

      (async () => {
        const remembered = await recallFolder();
        if (remembered) {
          try {
            if ((await remembered.queryPermission({ mode: 'readwrite' })) === 'granted') { await attachFolder(remembered); return finish(true); }
          } catch { /* fall through to the dialog */ }
        }
        $('#folderContinueName').textContent = remembered ? remembered.name : '';
        cont.hidden = !remembered;
        choose.className = remembered ? 'btn btn-secondary' : 'btn btn-primary';
        $('#folderTitle').textContent = remembered ? 'Welcome back' : 'Where should Top Shelf keep your lists?';
        showErr('');
        cont.onclick = async () => {
          showErr('');
          try {
            if ((await remembered.requestPermission({ mode: 'readwrite' })) !== 'granted') { showErr('Access wasn’t allowed. Allow it, or choose a different folder.'); return; }
            await attachFolder(remembered);
            finish(true);
          } catch { showErr('That folder isn’t available any more. Please choose a folder.'); }
        };
        choose.onclick = pickNew;
        $('#folderSkip').onclick = () => finish(false);
        folderDialog.oncancel = (e) => { e.preventDefault(); finish(false); };
        folderDialog.showModal();
        (remembered ? cont : choose).focus();
      })();
    });
  }

  /* Lists held only in memory (nothing could be saved), to hand over to a newly chosen folder. */
  async function collectMemoryLists() {
    await flushSave();
    const lists = [];
    for (const id of meta.order) {
      const raw = id === state.id ? state : await storeGet(listKey(id));
      if (!raw) continue;
      const copy = Object.assign(sanitize(JSON.parse(JSON.stringify(raw))), { id });
      if (gameCount(copy) > 0) lists.push(copy);
    }
    return { lists, active: lists.some((l) => l.id === state.id) ? state.id : null };
  }

  async function chooseFolderNow() {
    if (!FOLDER_SUPPORTED) { toast('This browser can’t save to a folder. Use Chrome or Edge.'); return; }
    let picked;
    try { picked = await window.showDirectoryPicker({ id: 'topshelf', mode: 'readwrite' }); }
    catch (e) { if (e && e.name !== 'AbortError') toast('Couldn’t open that folder.'); return; }

    const prev = { mode: storeMode, dir: dirHandle, img: imgDirHandle, picked: pickedHandle, label: folderLabel };
    const carry = storeMode === 'memory' ? await collectMemoryLists() : null;
    try {
      await flushSave();
      await attachFolder(picked);
    } catch {
      dirHandle = prev.dir; imgDirHandle = prev.img; pickedHandle = prev.picked; folderLabel = prev.label;
      toast('Top Shelf couldn’t write to that folder. Please pick another one.');
      return;
    }
    await rememberFolder(picked);
    storeMode = 'folder';
    setNotice(null);
    const ok = await startSession(carry);
    if (ok) toast(`Saving to “${folderLabel}”`);
  }

  /* Load whatever the chosen backend holds (or start fresh) and begin autosaving. */
  async function startSession(carry) {
    booted = false;
    clearTimeout(saveTimer); saveTimer = 0;
    try {
      meta = { order: [], active: null, index: {} };
      const saved = await storeGet(META_KEY);
      if (saved && Array.isArray(saved.order)) {
        meta = {
          order: saved.order.filter((x) => typeof x === 'string' && SAFE_ID.test(x)),
          active: saved.active,
          index: saved.index && typeof saved.index === 'object' ? saved.index : {},
        };
      }
      if (storeMode === 'folder') {
        const prefs = await storeGet(SETTINGS_KEY);
        if (prefs && typeof prefs === 'object') {
          if (typeof prefs.theme === 'string' && THEMES.some((t) => t.id === prefs.theme)) applyTheme(prefs.theme, false);
          if (prefs.preview === 'on' || prefs.preview === 'off') applyPreview(prefs.preview === 'on', false);
          fxOn = prefs.fx !== 'off';
          syncFxBtn();
          fxSound = prefs.sound === 'on';
        }
      }

      // Lists that were only in memory join the ones already in the folder.
      if (carry && carry.lists.length) {
        let activeId = null;
        for (const c of carry.lists) {
          const wasActive = c.id === carry.active;
          if (meta.order.includes(c.id)) c.id = uid();
          if (wasActive) activeId = c.id;
          await storeSet(listKey(c.id), c);
          meta.order.push(c.id);
          meta.index[c.id] = { title: c.title, count: gameCount(c) };
        }
        if (activeId) meta.active = activeId;
        await storeSet(META_KEY, meta);
      }

      if (meta.order.length) {
        if (!meta.order.includes(meta.active)) meta.active = meta.order[0];
        state = sanitize(await storeGet(listKey(meta.active)));
        state.id = meta.active;
      } else {
        state = defaultState();
        meta = { order: [state.id], active: state.id, index: {} };
      }
    } catch {
      // The files couldn't be read. Don't save anything, so nothing gets overwritten.
      setNotice('unreadable');
      return false;
    }

    booted = true;
    syncMeta();
    render();
    if (!meta.order.includes(state.id)) meta.order.push(state.id);
    const firstWrite = writeNow();
    if (storeMode === 'folder') {
      // Housekeeping once the first save has settled; if a file is busy, try once more shortly after.
      firstWrite
        .then(() => gcFolderImages())
        .catch(() => new Promise((resolve) => setTimeout(resolve, 2500)).then(() => gcFolderImages()))
        .catch((e) => console.warn('Top Shelf: image clean-up skipped', e));
    }
    return true;
  }

  async function boot() {
    render();
    // Ask for a folder (Chrome/Edge). Without one, or in other browsers, nothing can be saved.
    storeMode = FOLDER_SUPPORTED && (await folderGate()) ? 'folder' : 'memory';
    markStoreReady();
    if (storeMode === 'memory') setNotice('memory');
    await startSession(null);
  }

  boot();

  // Expose for debugging and tests
  window.GameTier = {
    get state() { return state; },
    get meta() { return meta; },
    exportPng, renderPng, switchList, newList, openQuick, fxFlyIn, openHelp, loadSamples,
    get version() { return APP_VERSION; },
  };
})();
