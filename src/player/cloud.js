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

