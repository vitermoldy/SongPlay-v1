const VIDEO_ID = /^[\w-]{11}$/;
const LIST_ID = /^[\w-]{12,}$/;
const HOSTS = new Set(['youtube.com', 'youtu.be', 'youtube-nocookie.com']);

// Reads what a pasted link points at. Returns { kind: 'video', id } or
// { kind: 'playlist', list, index }, or null when it is not a YouTube video or playlist.
// Auto-generated mixes (RD...), Watch later and Liked videos cannot be embedded as lists,
// so a link carrying one plays its video alone.
export function parseYouTube(raw) {
  const text = raw.trim();
  if (VIDEO_ID.test(text)) return { kind: 'video', id: text };

  let url;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^(www|m|music)\./, '');
  if (!HOSTS.has(host)) return null;

  let id = null;
  if (host === 'youtu.be') id = url.pathname.split('/')[1];
  else if (url.pathname === '/watch') id = url.searchParams.get('v');
  else id = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]{11})/)?.[1] ?? null;

  const list = url.searchParams.get('list');
  const listUsable = list && LIST_ID.test(list) && !/^(RD|WL$|LL$|LM$)/.test(list);
  if (listUsable) {
    const index = Math.max(0, Number(url.searchParams.get('index') || 1) - 1) || 0;
    return { kind: 'playlist', list, index };
  }
  if (id && VIDEO_ID.test(id)) return { kind: 'video', id };
  return null;
}

export function watchUrl(item) {
  return item.kind === 'playlist'
    ? `https://www.youtube.com/playlist?list=${item.list}`
    : `https://www.youtube.com/watch?v=${item.id}`;
}

// Title, channel and thumbnail from YouTube's oEmbed endpoint, which answers cross-origin.
// A 401 or 403 means the owner turned embedding off; a 404 a private or removed video.
export async function fetchInfo(item) {
  const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl(item))}`);
  if (!res.ok) {
    const error = new Error(`oEmbed ${res.status}`);
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return { title: data.title, author: data.author_name, thumb: data.thumbnail_url };
}

let apiPromise = null;

// The IFrame API is fetched on the first play, never on page load.
export function loadYouTubeApi() {
