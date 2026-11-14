// "Played most" in the queue panel: the songs this browser played most often,
// kept on the server (npm run server), each one a click away from the queue again;
// plus the recovery code that carries the queue to another browser.
import { cloudState, fetchStats, onCloud, recoveryCode, restoreFrom } from './cloud.js';

const $ = (selector) => document.querySelector(selector);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const clock = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * `enqueue(parsed)` adds a song to the queue the way the link form does.
 * `restore(data)` writes another browser's queue and settings over this one's.
 */
export function mountHistory({ enqueue, restore, say }) {
  const ui = {
    status: $('[data-history-status]'),
    list: $('[data-history-list]'),
    empty: $('[data-history-empty]'),
    code: $('[data-history-code]'),
    copy: $('[data-history-copy]'),
    form: $('[data-history-restore]'),
    input: $('#history-code'),
    error: $('#history-error'),
  };
  let stats = null;

  function row(song) {
    const li = document.createElement('li');
    li.className = 'queue-item history-item';
    const thumb = document.createElement('img');
    thumb.className = 'queue-thumb';
    thumb.width = 96;
    thumb.height = 54;
    thumb.alt = '';
    thumb.loading = 'lazy';
    thumb.decoding = 'async';
    if (song.kind === 'video') thumb.src = `https://i.ytimg.com/vi/${song.id}/mqdefault.jpg`;
    const meta = document.createElement('div');
    const title = document.createElement('p');
    title.className = 'queue-title';
    title.textContent = song.title || (song.kind === 'playlist' ? 'YouTube playlist' : 'YouTube video');
    const sub = document.createElement('p');
    sub.className = 'queue-sub';
    sub.textContent = `Played ${plural(song.plays, 'time', 'times')}`;
    meta.append(title, sub);
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'icon-btn';
    add.setAttribute('aria-label', `Add ${title.textContent} to the queue`);
    add.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>';
    add.addEventListener('click', () => enqueue(song.kind === 'playlist' ? { kind: 'playlist', list: song.id } : { kind: 'video', id: song.id }));
    li.append(thumb, meta, add);
    return li;
  }

  function render(state = cloudState()) {
    ui.code.textContent = recoveryCode();
    const waiting = state.pending > 0 ? ` ${plural(state.pending, 'play waits', 'plays wait')} to be sent.` : '';
    ui.status.textContent =
      state.status === 'online'
        ? `Kept on the server.${state.lastSaved ? ` Queue last saved at ${clock(state.lastSaved)}.` : ''}${waiting}`
        : state.status === 'offline'
          ? `The server is not reachable, so the history is out of sight for now. The queue stays in this browser.${waiting}`
          : 'Checking the server…';
    const top = stats?.top ?? [];
    ui.list.replaceChildren(...top.slice(0, 5).map(row));
    ui.empty.hidden = !stats || top.length > 0;
    if (stats && top.length === 0) ui.empty.textContent = 'Songs you play show up here, most played first.';
  }

  let pending = 0;
  async function refresh() {
    stats = await fetchStats(14);
    render();
  }
  /** After a play, the counts change; one refresh a moment later covers a burst of them. */
  function refreshSoon() {
    clearTimeout(pending);
    pending = setTimeout(refresh, 1500);
  }

  onCloud((state) => render(state));
  $('[data-queue-toggle]')?.addEventListener('click', () => void refresh());

  ui.copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(recoveryCode());
      say('Recovery code copied.');
      ui.copy.textContent = 'Copied';
      setTimeout(() => (ui.copy.textContent = 'Copy code'), 1600);
    } catch {
      say(`Your recovery code is ${recoveryCode()}.`);
    }
  });

  ui.input.addEventListener('input', () => {
    ui.error.hidden = true;
    ui.input.removeAttribute('aria-invalid');
  });

  ui.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const data = JSON.parse(await restoreFrom(ui.input.value));
      restore(data);
      location.reload();
    } catch (e) {
      ui.input.setAttribute('aria-invalid', 'true');
      ui.error.textContent =
        e.code === 'format' || e.status === 400
          ? 'A recovery code has 12 letters and digits.'
          : e.code === 'offline'
            ? 'The server is not reachable. Start it, then try again.'
            : e.status === 404
              ? 'Nothing is saved under that code.'
              : 'That code could not be used. Try again in a moment.';
      ui.error.hidden = false;
    }
  });

  render();
  void refresh();
  return { refreshSoon };
}
