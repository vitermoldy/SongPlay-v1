const VIDEO_ID = /^[\w-]{11}$/;
const LIST_ID = /^[\w-]{12,}$/;
const HOSTS = new Set(['youtube.com', 'youtu.be', 'youtube-nocookie.com']);

// Reads what a pasted link points at. Returns { kind: 'video', id } or
// { kind: 'playlist', list, index }, or null when it is not a YouTube video or playlist.
