const CACHE='worthswitch-v5-3-1';

const ASSETS=[
  './',
  'index.html',
  'styles.css',
  'app.js',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png'
];

self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(CACHE).then(cache=>cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(keys=>
      Promise.all(
        keys
          .filter(key=>key!==CACHE)
          .map(key=>caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch',e=>{
  e.respondWith(
    fetch(e.request)
      .then(response=>{
        const copy=response.clone();

        caches.open(CACHE).then(cache=>{
          cache.put(e.request,copy);
        });

        return response;
      })
      .catch(async () => {
  const cached = await caches.match(e.request);

  if (cached) {
    return cached;
  }

  if (e.request.mode === 'navigate') {
    return caches.match('./');
  }

  return Response.error();
})
  );
});
