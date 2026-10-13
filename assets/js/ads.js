/* #####################################################################
   ##                                                                 ##
   ##   👉  AQUÍ PEGAS TUS DATOS DE GOOGLE ADSENSE (ÚNICO SITIO)  👈   ##
   ##                                                                 ##
   #####################################################################

   Este archivo se carga en TODAS las páginas de la web, así que solo
   tienes que rellenarlo una vez.

   PASO 1 — Tu ID de editor
   En AdSense > Cuenta > Información de la cuenta verás algo como
   "pub-1234567890123456". Escríbelo abajo con "ca-" delante:
        publisherId: "ca-pub-1234567890123456",

   Con solo esto ya funcionan los "Anuncios automáticos" (si los activas
   en AdSense) y el mensaje de cookies de Google (consentimiento RGPD).

   PASO 2 (opcional) — Bloques de anuncios en los huecos reservados
   En AdSense > Anuncios > Por bloque de anuncios > "Anuncio display",
   crea dos bloques y copia el número de "data-ad-slot" de cada uno:
        belowTool: "1234567890",   // hueco debajo del conversor
        inContent: "0987654321",   // hueco dentro del texto

   Mientras publisherId esté vacío, la web NO carga nada de Google y los
   huecos de anuncios permanecen ocultos (la web se ve limpia).
   ##################################################################### */
window.MCE_ADS = {
  publisherId: "",   // ← ej.: "ca-pub-1234567890123456"
  slots: {
    belowTool: "",   // ← ej.: "1234567890"
    inContent: ""    // ← ej.: "0987654321"
  }
};

/* ----- No hace falta tocar nada debajo de esta línea ----- */
(function () {
  var cfg = window.MCE_ADS;
  if (!/^ca-pub-\d{10,20}$/.test(cfg.publisherId)) return;

  // Script oficial de AdSense. Incluye automáticamente el mensaje de
  // consentimiento de Google (CMP certificada) cuando lo publicas en
  // AdSense > Privacidad y mensajes.
  var s = document.createElement("script");
  s.async = true;
  s.crossOrigin = "anonymous";
  s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + cfg.publisherId;
  document.head.appendChild(s);

  function fillSlots() {
    document.querySelectorAll("[data-ad-slot-name]").forEach(function (box) {
      var slot = cfg.slots[box.getAttribute("data-ad-slot-name")];
      if (!slot) return;
      box.hidden = false;
      var ins = document.createElement("ins");
      ins.className = "adsbygoogle";
      ins.style.display = "block";
      ins.setAttribute("data-ad-client", cfg.publisherId);
      ins.setAttribute("data-ad-slot", slot);
      ins.setAttribute("data-ad-format", "auto");
      ins.setAttribute("data-full-width-responsive", "true");
      box.appendChild(ins);
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fillSlots);
  else fillSlots();
})();
