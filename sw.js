/* =====================================================================
   SERVICE WORKER — hace que la web se pueda instalar como app y que
   funcione sin conexión.

   ⚠️ Cada vez que cambies archivos de la web y la vuelvas a publicar,
   sube el número de VERSION (v1 → v2 → v3…). Así los móviles que
   tienen la app instalada descargan la versión nueva.
   ===================================================================== */
var VERSION = "v1";
var CACHE = "mce-" + VERSION;
var CORE = [
  "./", "es/", "en/",
  "assets/css/styles.css",
  "assets/js/app.js", "assets/js/countries.js", "assets/js/ads.js",
  "assets/i18n/es.js", "assets/i18n/en.js",
  "assets/data/rates-fallback.json",
  "assets/img/favicon.svg", "assets/img/icon-192.png"
];

function abs(p) { return new URL(p, self.registration.scope).href; }

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(CORE.map(abs)); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k.indexOf("mce-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  var url = new URL(req.url);
  // Solo archivos propios. Anuncios, tipos de cambio, etc. van directos a internet.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  var key = url.origin + url.pathname; // sin ?from=…&to=…

  if (req.mode === "navigate") {
    // Páginas: primero internet (contenido fresco); sin conexión, la copia guardada.
    event.respondWith(
      fetch(req).then(function (res) {
        if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(key, copy); }); }
        return res;
      }).catch(function () {
        return caches.match(key).then(function (hit) {
          return hit || caches.match(abs(url.pathname.indexOf("/en/") === 0 ? "en/" : "es/"));
        });
      })
    );
    return;
  }

  // Estilos, scripts e imágenes: copia guardada al instante y se actualiza en segundo plano.
  event.respondWith(
    caches.match(key).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(key, copy); }); }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
