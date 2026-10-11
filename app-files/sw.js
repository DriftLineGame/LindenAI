// SCODE AI app helper (service worker).
// It always gets the newest version of the site when you're online, so every update you upload
// shows up the next time the app opens. It only keeps a copy for when you're offline.
// It never touches messages: anything going to the SCODE AI server goes straight through.
const CACHE = "scode-app-v1";
const SHELL = ["./", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const OFFLINE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>SCODE AI</title><style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#08090d;color:#efeef6;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;text-align:center}
.b{width:120px;height:120px;margin:0 auto 26px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#3fc1ff,#8b6bff 45%,#ff5fb0 80%);box-shadow:0 0 60px rgba(139,107,255,.5)}
h1{font-size:24px;margin:0 0 8px}p{color:#a8a6c0;margin:0 0 22px}button{border:0;border-radius:999px;padding:11px 22px;font:inherit;font-weight:600;color:#fff;background:linear-gradient(110deg,#ff5fb0,#8b6bff 52%,#3fc1ff);cursor:pointer}
</style></head><body><div><div class="b"></div><h1>You're offline</h1><p>SCODE AI needs the internet. Check your connection and try again.</p><button onclick="location.reload()">Try again</button></div></body></html>`;

self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  const url = new URL(r.url);
  if (url.origin !== self.location.origin) return;      // the AI server, maps, fonts: straight through, never stored
  if (r.mode === "navigate") {
    // Opening the app: always ask the site for the newest page; fall back to the saved copy offline.
    e.respondWith(
      fetch(new Request(url.href, { cache: "no-cache", credentials: "same-origin" }))
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put("./", copy)).catch(() => {}); }
          return res;
        })
        .catch(() => caches.match("./").then((m) => m || new Response(OFFLINE, { headers: { "Content-Type": "text/html; charset=utf-8" } })))
    );
    return;
  }
  if (SHELL.some((s) => url.pathname.endsWith(s.replace("./", "/")) && s !== "./")) {
    e.respondWith(fetch(r).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(r, copy)).catch(() => {}); }
      return res;
    }).catch(() => caches.match(r).then((m) => m || Response.error())));
  }
});
