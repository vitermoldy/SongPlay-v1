// Link to the app's own server (npm run server). Everything here is optional: with
// the server off, or the site opened as static files, the app works exactly as
// before; events wait in the browser and go out once the server answers.
//
// A browser is known by a 12-character recovery code. The browser save is copied
// to the server under that code, so typing the code into another browser brings
// the same progress there.

const APP = 'songplay-v1';
const ID_KEY = `${APP}:cloud-id`;
const OUTBOX_KEY = `${APP}:cloud-outbox`;
const SAVED_KEY = `${APP}:cloud-saved`;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const OUTBOX_CAP = 500;

const read = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key, value) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

let code = read(ID_KEY);
if (!code || !/^[A-HJ-NP-Z2-9]{12}$/.test(code)) {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  code = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
  write(ID_KEY, code);
}

/** The recovery code, grouped for reading: ABCD-EFGH-JKLM. */
export const recoveryCode = () => code.match(/.{4}/g).join('-');

// online: the last request reached the server. offline: it did not. unknown: nothing tried yet.
let status = 'unknown';
let lastSaved = Number(read(SAVED_KEY)) || 0;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn(cloudState()));
const setStatus = (next) => {
  if (next !== status) {
    status = next;
    notify();
  }
};

/** Status, last time the save reached the server, and how many events wait to be sent. */
export function cloudState() {
  return { status, lastSaved, pending: outbox().length };
}

export function onCloud(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

async function api(path, init) {
  const res = await fetch(`/api${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error || `HTTP ${res.status}`), { status: res.status });
  return body;
}

function outbox() {
  try {
    const list = JSON.parse(read(OUTBOX_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

const localDay = (t = new Date()) =>
  `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;

/** Records something that happened; it is sent now, or later if the server is away. */
export function logEvent(kind, data) {
  const list = outbox();
  list.push({ kind, at: Date.now(), day: localDay(), data });
  write(OUTBOX_KEY, JSON.stringify(list.slice(-OUTBOX_CAP)));
  notify();
  flushEvents();
}

let flushing = false;
export async function flushEvents() {
  if (flushing) return;
  const list = outbox();
  if (list.length === 0) return;
  flushing = true;
  const batch = list.slice(0, 200);
  try {
    await api('/events', { method: 'POST', body: JSON.stringify({ device: code, events: batch }) });
    // Only what was sent leaves the queue; anything logged meanwhile stays.
    write(OUTBOX_KEY, JSON.stringify(outbox().slice(batch.length)));
    setStatus('online');
    notify();
  } catch (err) {
    // A 4xx means the batch itself is unusable; drop it rather than retry it forever.
    if (err.status >= 400 && err.status < 500 && err.status !== 429) write(OUTBOX_KEY, JSON.stringify(outbox().slice(batch.length)));
    setStatus(err.status ? 'online' : 'offline');
  } finally {
    flushing = false;
  }
  if (outbox().length > 0 && status === 'online') flushEvents();
}

let saveTimer = 0;
let saveText = '';
/** Copies the browser save (its JSON text) to the server, a moment after the last change. */
export function mirrorSave(text) {
  if (!text || frozen) return;
  saveText = text;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(pushSave, 2000);
}

