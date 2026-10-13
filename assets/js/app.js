/* =====================================================================
   My Currency Exchange — lógica de la herramienta.
   No hace falta tocar este archivo para cambiar textos: los textos
   están en assets/i18n/es.js y assets/i18n/en.js.
   ===================================================================== */
(function () {
  "use strict";

  var T = window.MCE_TEXT;
  var SCRIPT_URL = document.currentScript ? document.currentScript.src : location.href;
  var CACHE_KEY = "mce_rates_v1";
  var CACHE_MAX_AGE = 6 * 60 * 60 * 1000; // vuelve a pedir tipos cada 6 horas

  var SOURCES = [
    {
      name: "ExchangeRate-API",
      link: "https://www.exchangerate-api.com",
      url: "https://open.er-api.com/v6/latest/USD",
      parse: function (d) {
        if (d.result !== "success") throw new Error("bad response");
        return { updated: d.time_last_update_unix * 1000, rates: d.rates };
      }
    },
    {
      name: "Currency API (fawazahmed0)",
      link: "https://github.com/fawazahmed0/exchange-api",
      url: "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
      parse: function (d) {
        var rates = {};
        Object.keys(d.usd).forEach(function (k) {
          if (/^[a-z]{3}$/.test(k)) rates[k.toUpperCase()] = d.usd[k];
        });
        return { updated: Date.parse(d.date + "T00:00:00Z"), rates: rates };
      }
    }
  ];

  /* ------------------------------------------------------------------
     1. ARITMÉTICA DECIMAL EXACTA
     Los números se guardan como enteros grandes (BigInt) multiplicados
     por 10^30, así no hay errores de redondeo como 0.1 + 0.2 = 0.3000…4
     ------------------------------------------------------------------ */
  var SCALE = 30;
  var ONE = pow10(SCALE);

  function pow10(n) { var r = BigInt(1); for (var i = 0; i < n; i++) r *= BigInt(10); return r; }

  function divRound(a, b) { // redondeo "mitad hacia arriba" (el habitual)
    return (a * BigInt(2) + b) / (BigInt(2) * b);
  }

  function toScaled(value) {
    var s = String(value).trim().toLowerCase();
    var exp = 0;
    if (s.indexOf("e") > -1) { var parts = s.split("e"); s = parts[0]; exp = parseInt(parts[1], 10); }
    var neg = s.charAt(0) === "-";
    if (neg || s.charAt(0) === "+") s = s.slice(1);
    var ip = s.split(".");
    var frac = ip[1] || "";
    var v = BigInt((ip[0] + frac) || "0");
    var p = SCALE - frac.length + exp;
    v = p >= 0 ? v * pow10(p) : divRound(v, pow10(-p));
    return neg ? -v : v;
  }

  function roundTo(v, decimals) { return divRound(v, pow10(SCALE - decimals)); }

  function groupInt(intStr) {
    return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, T.groupSeparator);
  }

  /* Formatea con "decimals" decimales; si trim=true quita ceros finales
     dejando como mínimo "minDecimals". */
  function formatDec(v, decimals, trim, minDecimals) {
    var q = roundTo(v, decimals).toString();
    if (decimals === 0) return groupInt(q);
    q = q.padStart(decimals + 1, "0");
    var intPart = q.slice(0, q.length - decimals);
    var frac = q.slice(q.length - decimals);
    if (trim) {
      var min = minDecimals || 0;
      while (frac.length > min && frac.charAt(frac.length - 1) === "0") frac = frac.slice(0, -1);
    }
    return groupInt(intPart) + (frac ? T.decimalSeparator + frac : "");
  }

  /* Decimales a mostrar en un tipo de cambio: 6 cifras significativas
     tras los ceros iniciales (1 JPY = 0,005712 EUR). */
  function rateDecimals(v) {
    if (v >= ONE) return 6;
    var frac = v.toString().padStart(SCALE, "0");
    var zeros = frac.length - frac.replace(/^0+/, "").length;
    return Math.min(zeros + 6, SCALE);
  }

  /* Convierte lo que escribe el usuario ("1.250,50", "1,250.50", "1250")
     en un número. Devuelve null si no es válido. */
  function parseAmount(text) {
    var s = String(text).replace(/[\s '’_]/g, "").replace(/[^\d.,]/g, "");
    if (!s || !/\d/.test(s)) return null;
    var dot = s.lastIndexOf("."), comma = s.lastIndexOf(",");
    var decSep = null;
    if (dot > -1 && comma > -1) decSep = dot > comma ? "." : ",";
    else if (dot > -1 || comma > -1) {
      var sep = dot > -1 ? "." : ",";
      var count = s.split(sep).length - 1;
      var after = s.length - s.lastIndexOf(sep) - 1;
      if (count > 1) decSep = null;                         // 1.000.000
      else if (after === 3 && sep !== T.decimalSeparator) decSep = null; // 1.000 (es) / 1,000 (en)
      else decSep = sep;
    }
    var intPart = s, frac = "";
    if (decSep) { var i = s.lastIndexOf(decSep); intPart = s.slice(0, i); frac = s.slice(i + 1).replace(/[.,]/g, ""); }
    intPart = intPart.replace(/[.,]/g, "") || "0";
    if (intPart.replace(/^0+/, "").length > 15 || frac.length > 12) return null;
    return intPart + (frac ? "." + frac : "");
  }

  function currencyDigits(code) {
    try {
      return new Intl.NumberFormat("en", { style: "currency", currency: code }).resolvedOptions().maximumFractionDigits;
    } catch (e) { return 2; }
  }

  /* ------------------------------------------------------------------
     2. TIPOS DE CAMBIO
     ------------------------------------------------------------------ */
  function readCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (e) { return null; }
  }
  function writeCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (e) { /* sin almacenamiento */ }
  }

  function fetchJson(url) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = ctrl && setTimeout(function () { ctrl.abort(); }, 8000);
    return fetch(url, ctrl ? { signal: ctrl.signal } : {}).then(function (r) {
      if (timer) clearTimeout(timer);
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  function loadRates() {
    var cached = readCache();
    if (cached && cached.rates && Date.now() - cached.fetched < CACHE_MAX_AGE) {
      return Promise.resolve(cached);
    }
    var i = 0;
    function next() {
      if (i >= SOURCES.length) return fallback();
      var src = SOURCES[i++];
      return fetchJson(src.url).then(function (d) {
        var p = src.parse(d);
        var data = { fetched: Date.now(), updated: p.updated, rates: p.rates, source: src.name, link: src.link };
        writeCache(data);
        return data;
      }).catch(next);
    }
    function fallback() {
      if (cached && cached.rates) { cached.stale = true; return cached; }
      return fetchJson(new URL("../data/rates-fallback.json", SCRIPT_URL).href).then(function (d) {
        return { fetched: 0, updated: d.updated * 1000, rates: d.rates, source: "ExchangeRate-API", link: "https://www.exchangerate-api.com", stale: true };
      });
    }
    return next();
  }

  /* ------------------------------------------------------------------
     3. ÍNDICE DE BÚSQUEDA (países + monedas)
     ------------------------------------------------------------------ */
  function normalize(s) {
    return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  }
  function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  var regionNames = safeDisplayNames("region");
  var currencyNames = safeDisplayNames("currency");
  function safeDisplayNames(type) {
    try { return new Intl.DisplayNames([T.locale], { type: type }); } catch (e) { return null; }
  }
  function countryName(code) {
    if (code === "EU") return T.lang === "es" ? "Unión Europea" : "European Union";
    try { return (regionNames && regionNames.of(code)) || code; } catch (e) { return code; }
  }
  function currencyName(code) {
    var extra = (T.lang === "es")
      ? { XCG: "florín del Caribe", ZWG: "oro de Zimbabue", SLE: "leone de Sierra Leona", VES: "bolívar venezolano", TVD: "dólar tuvaluano", FOK: "corona feroesa", GGP: "libra de Guernsey", IMP: "libra de la Isla de Man", JEP: "libra de Jersey", KID: "dólar de Kiribati", CNH: "yuan chino (extraterritorial)" }
      : { XCG: "Caribbean guilder", ZWG: "Zimbabwe Gold", SLE: "Sierra Leonean leone", TVD: "Tuvaluan dollar", FOK: "Faroese króna", GGP: "Guernsey pound", IMP: "Manx pound", JEP: "Jersey pound", KID: "Kiribati dollar", CNH: "Chinese yuan (offshore)" };
    var n = null;
    try { n = currencyNames && currencyNames.of(code); } catch (e) { /* código raro */ }
    if (!n || n === code) n = extra[code] || code;
    return capitalize(n);
  }
  function flagEmoji(cc) {
    if (!cc) return "🌍";
    return String.fromCodePoint.apply(null, cc.split("").map(function (c) { return 0x1f1e6 + c.charCodeAt(0) - 65; }));
  }

  var INDEX = [];        // todas las entradas buscables
  var CURRENCY_FLAG = {}; // moneda -> país de su bandera
  var available = {};    // monedas con tipo de cambio disponible

  function buildIndex(rates) {
    available = rates;
    var aliases = (window.MCE_ALIASES || {})[T.lang] || {};
    var usage = {}, usedIn = {};
    INDEX = [];
    window.MCE_COUNTRIES.forEach(function (c) {
      c.currencies.forEach(function (cur) {
        if (!rates[cur]) return;
        usage[cur] = (usage[cur] || 0) + 1;
        usedIn[cur] = c.code;
        if (!(cur in CURRENCY_FLAG)) CURRENCY_FLAG[cur] = c.code;
        var name = countryName(c.code);
        var cName = currencyName(cur);
        INDEX.push({
          type: "country", country: c.code, currency: cur, name: name, sub: cName + " (" + cur + ")",
          n: normalize(name), a: normalize(aliases[c.code] || ""), c: normalize(cName)
        });
      });
    });
    var overrides = window.MCE_CURRENCY_FLAG || {};
    Object.keys(overrides).forEach(function (k) { CURRENCY_FLAG[k] = overrides[k]; });
    Object.keys(rates).forEach(function (cur) {
      if (!/^[A-Z]{3}$/.test(cur) || cur === "XDR" || cur === "CLF") return;
      var cName = currencyName(cur);
      var flag = cur in CURRENCY_FLAG ? CURRENCY_FLAG[cur] : null;
      INDEX.push({
        type: "currency", country: null, currency: cur, name: cName + " (" + cur + ")",
        sub: usage[cur] > 1 ? T.currencyResult.replace("{n}", usage[cur])
          : usage[cur] === 1 ? T.currencyOf.replace("{country}", countryName(usedIn[cur])) : T.currencyResultOne,
        n: normalize(cName), a: normalize(flag ? (aliases[flag] || "") : ""), c: "", code: cur.toLowerCase()
      });
    });
  }

  function scoreEntry(e, q) {
    if (e.type === "currency" && q === e.code) return 0;
    if (e.n.indexOf(q) === 0) return e.type === "country" ? 1 : 1.5;
    if ((" " + e.n).indexOf(" " + q) > -1) return 2;
    if (e.a && (" " + e.a).indexOf(" " + q) > -1) return e.type === "country" ? 2.5 : 2.6;
    if (e.type === "currency" && e.code.indexOf(q) === 0) return 3;
    if (e.c && (" " + e.c).indexOf(" " + q) > -1) return 4;
    if (e.type === "country" && e.currency.toLowerCase() === q) return 4;
    if (e.n.indexOf(q) > -1 || (e.a && e.a.indexOf(q) > -1)) return 5;
    return -1;
  }

  function rank(e) { // las monedas y países más usados salen antes
    var list = window.MCE_POPULAR_CURRENCIES || [];
    var i = list.indexOf(e.currency);
    return i < 0 ? 99 : i;
  }

  function search(query) {
    var q = normalize(query);
    if (!q) {
      return (window.MCE_POPULAR || []).map(function (cc) {
        for (var i = 0; i < INDEX.length; i++) if (INDEX[i].country === cc) return INDEX[i];
        return null;
      }).filter(Boolean);
    }
    var res = [];
    INDEX.forEach(function (e) { var s = scoreEntry(e, q); if (s >= 0) res.push({ e: e, s: s }); });
    res.sort(function (x, y) { return x.s - y.s || rank(x.e) - rank(y.e) || x.e.name.localeCompare(y.e.name, T.locale); });
    return res.slice(0, 60).map(function (r) { return r.e; });
  }

  function entryFor(currency, country) {
    for (var i = 0; i < INDEX.length; i++) {
      var e = INDEX[i];
      if (e.currency === currency && (country ? e.country === country : e.type === "currency")) return e;
    }
    return null;
  }

  function labelOf(e) {
    return e.type === "country" ? e.name + " · " + e.sub : e.name;
  }
  function shortLabel(e) { // lo que se ve dentro de la casilla tras elegir
    return e.name;
  }
  function subLabel(e) { // línea de debajo: qué moneda se ha elegido
    return e.type === "country" ? T.currencyLabel.replace("{name}", e.sub) : e.sub;
  }
  function flagOf(e) {
    return flagEmoji(e.type === "country" ? e.country : CURRENCY_FLAG[e.currency]);
  }

  /* ------------------------------------------------------------------
     4. INTERFAZ
     ------------------------------------------------------------------ */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var state = { from: null, to: null, rates: null, meta: null, touched: false };
  var srStatus;

  function announce(msg) {
    if (!srStatus) return;
    srStatus.textContent = "";
    setTimeout(function () { srStatus.textContent = msg; }, 50);
  }

  function toast(msg) {
    var t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.classList.remove("show"); }, 2500);
  }

  function setupCombo(root, side) {
    var input = $("input", root);
    var list = $("[role=listbox]", root);
    var flag = $(".combo-flag", root);
    var sub = $(".combo-sub", root);
    var results = [];
    var active = -1;

    function show(selected) {
      flag.textContent = selected ? flagOf(selected) : "🔍";
      input.value = selected ? shortLabel(selected) : "";
      sub.textContent = selected ? subLabel(selected) : "";
      root.classList.toggle("is-chosen", !!selected);
    }

    function render() {
      results = search(input.value);
      active = -1;
      list.innerHTML = "";
      if (!normalize(input.value) && results.length) {
        var h = document.createElement("li");
        h.className = "combo-heading";
        h.setAttribute("role", "presentation");
        h.textContent = T.popular;
        list.appendChild(h);
      }
      if (!results.length) {
        var empty = document.createElement("li");
        empty.className = "combo-empty";
        empty.setAttribute("role", "presentation");
        empty.textContent = T.noResults;
        list.appendChild(empty);
      }
      results.forEach(function (e, i) {
        var li = document.createElement("li");
        li.id = input.id + "-opt-" + i;
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", "false");
        li.innerHTML = '<span class="opt-flag" aria-hidden="true"></span><span class="opt-text"><span class="opt-name"></span><span class="opt-sub"></span></span>';
        $(".opt-flag", li).textContent = flagOf(e);
        $(".opt-name", li).textContent = e.name;
        $(".opt-sub", li).textContent = e.sub;
        li.addEventListener("mousedown", function (ev) { ev.preventDefault(); choose(i); });
        list.appendChild(li);
      });
      open();
      if (normalize(input.value)) announce(T.resultsCount.replace("{n}", results.length));
    }

    function open() { list.hidden = false; input.setAttribute("aria-expanded", "true"); root.classList.add("is-open"); }
    function close() {
      list.hidden = true; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant");
      root.classList.remove("is-open");
    }

    function setActive(i) {
      var opts = list.querySelectorAll("[role=option]");
      if (!opts.length) return;
      active = (i + opts.length) % opts.length;
      opts.forEach(function (o, k) { o.setAttribute("aria-selected", k === active ? "true" : "false"); });
      input.setAttribute("aria-activedescendant", opts[active].id);
      opts[active].scrollIntoView({ block: "nearest" });
    }

    function choose(i) {
      var e = results[i];
      if (!e) return;
      state[side] = e;
      state.touched = true;
      show(e);
      close();
      announce(T.selectedAnnounce.replace("{name}", labelOf(e)));
      update();
      if (side === "from" && !state.to) $("#to-search").focus();
    }

    input.addEventListener("focus", function () { input.select(); render(); });
    input.addEventListener("click", function () { if (list.hidden) render(); });
    input.addEventListener("input", function () { flag.textContent = "🔍"; render(); });
    input.addEventListener("blur", function () { close(); show(state[side]); });
    input.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowDown") { ev.preventDefault(); if (list.hidden) render(); setActive(active + 1); }
      else if (ev.key === "ArrowUp") { ev.preventDefault(); if (list.hidden) render(); setActive(active - 1); }
      else if (ev.key === "Enter") {
        if (!list.hidden && results.length) { ev.preventDefault(); choose(active > -1 ? active : 0); }
      }
      else if (ev.key === "Escape") { if (!list.hidden) { ev.preventDefault(); close(); show(state[side]); input.select(); } }
    });

    return { show: show };
  }

  function update() {
    var out = $("#cv-result");
    var main = $("#res-main"), exact = $("#res-exact"), rate = $("#res-rate"), from = $("#res-from");
    var amountText = $("#amount").value;
    var share = $("#share");
    var amountStr = parseAmount(amountText);

    if (!state.from || !state.to) {
      out.classList.add("is-empty");
      from.textContent = "";
      main.textContent = !state.from ? (state.to ? T.chooseFrom : T.chooseBoth) : T.chooseTo;
      exact.textContent = rate.textContent = "";
      share.hidden = true;
      return;
    }
    if (amountStr === null) {
      out.classList.add("is-empty");
      from.textContent = "";
      main.textContent = T.invalidAmount;
      exact.textContent = rate.textContent = "";
      share.hidden = true;
      return;
    }
    out.classList.remove("is-empty");

    var fc = state.from.currency, tc = state.to.currency;
    var rf = toScaled(state.rates[fc]), rt = toScaled(state.rates[tc]);
    var amount = toScaled(amountStr);
    var result = divRound(amount * rt, rf);
    var rateFT = divRound(rt * ONE, rf);
    var rateTF = divRound(rf * ONE, rt);
    var digits = currencyDigits(tc);

    var typedDecimals = (amountStr.split(".")[1] || "").length;
    var amountFmt = formatDec(amount, Math.max(currencyDigits(fc), typedDecimals), true, typedDecimals) + " " + fc;
    var resultFmt = formatDec(result, digits, false) + " " + tc;
    var exactFmt = formatDec(result, digits + 8, true, digits) + " " + tc;

    from.textContent = amountFmt + " =";
    main.textContent = resultFmt;
    exact.textContent = exactFmt !== resultFmt ? T.unrounded.replace("{value}", exactFmt) : "";
    rate.innerHTML = "";
    [[fc, rateFT, tc], [tc, rateTF, fc]].forEach(function (r) {
      var span = document.createElement("span");
      span.textContent = T.rateLine.replace("{from}", r[0]).replace("{rate}", formatDec(r[1], rateDecimals(r[1]), true, 2)).replace("{to}", r[2]);
      rate.appendChild(span);
    });

    // URL compartible
    var params = new URLSearchParams();
    params.set("from", fc); if (state.from.country) params.set("fc", state.from.country);
    params.set("to", tc); if (state.to.country) params.set("tc", state.to.country);
    params.set("amount", amountStr);
    var url = location.origin + location.pathname + "?" + params.toString();
    if (state.touched && location.protocol !== "file:") history.replaceState(null, "", "?" + params.toString());
    var text = T.shareText.replace("{amount}", amountFmt).replace("{result}", resultFmt);
    $("#share-wa").href = "https://wa.me/?text=" + encodeURIComponent(text + " " + url);
    $("#share-x").href = "https://x.com/intent/tweet?text=" + encodeURIComponent(text) + "&url=" + encodeURIComponent(url);
    $("#share-copy").dataset.url = url;
    share.hidden = false;
  }

  function showMeta() {
    var m = state.meta, el = $("#cv-meta");
    if (!el) return;
    var date = new Intl.DateTimeFormat(T.locale, { dateStyle: "long", timeStyle: "short" }).format(new Date(m.updated));
    el.innerHTML = "";
    var p = document.createElement("span");
    p.textContent = (m.stale ? T.offline.replace("{date}", date) : T.updated.replace("{date}", date)) + " " + T.sourceLabel + " ";
    var a = document.createElement("a");
    a.href = m.link; a.rel = "noopener"; a.target = "_blank"; a.textContent = m.source;
    el.appendChild(p); el.appendChild(a);
  }

  /* Tablas de cantidades frecuentes en las páginas de cada par */
  function fillTables() {
    document.querySelectorAll("table[data-from][data-to]").forEach(function (tbl) {
      var f = tbl.dataset.from, t = tbl.dataset.to;
      if (!state.rates[f] || !state.rates[t]) return;
      var rf = toScaled(state.rates[f]), rt = toScaled(state.rates[t]);
      var tbody = tbl.tBodies[0] || tbl.appendChild(document.createElement("tbody"));
      tbody.innerHTML = "";
      (tbl.dataset.amounts || "1,5,10,20,50,100,250,500,1000").split(",").forEach(function (a) {
        var tr = document.createElement("tr");
        var v = divRound(toScaled(a) * rt, rf);
        tr.innerHTML = "<td></td><td></td>";
        tr.cells[0].textContent = formatDec(toScaled(a), 0, false) + " " + f;
        tr.cells[1].textContent = formatDec(v, currencyDigits(t), false) + " " + t;
        tbody.appendChild(tr);
      });
    });
    document.querySelectorAll("[data-live-rate]").forEach(function (el) {
      var p = el.dataset.liveRate.split("-");
      if (!state.rates[p[0]] || !state.rates[p[1]]) return;
      var r = divRound(toScaled(state.rates[p[1]]) * ONE, toScaled(state.rates[p[0]]));
      el.textContent = formatDec(r, rateDecimals(r), true, 2);
    });
  }

  function initConverter(data) {
    var root = $("#converter");
    state.rates = data.rates;
    state.meta = data;
    buildIndex(data.rates);
    showMeta();
    fillTables();
    if (!root) return;

    var fromCombo = setupCombo($("#pick-from"), "from");
    var toCombo = setupCombo($("#pick-to"), "to");

    // Valores iniciales: enlace compartido > página de un par > vacío
    var q = new URLSearchParams(location.search);
    var f = q.get("from") || root.dataset.from, t = q.get("to") || root.dataset.to;
    if (f) state.from = entryFor(f.toUpperCase(), q.get("fc")) || entryFor(f.toUpperCase());
    if (t) state.to = entryFor(t.toUpperCase(), q.get("tc")) || entryFor(t.toUpperCase());
    if (q.get("amount") && parseAmount(q.get("amount"))) {
      var a = parseAmount(q.get("amount")).split(".");
      $("#amount").value = groupInt(a[0]) + (a[1] ? T.decimalSeparator + a[1] : "");
    }
    fromCombo.show(state.from);
    toCombo.show(state.to);

    $("#amount").addEventListener("input", function () { state.touched = true; update(); });
    $("#swap").addEventListener("click", function () {
      var tmp = state.from; state.from = state.to; state.to = tmp; state.touched = true;
      fromCombo.show(state.from); toCombo.show(state.to);
      update(); announce(T.swapped);
    });
    document.querySelectorAll("[data-pair]").forEach(function (b) {
      b.addEventListener("click", function () {
        var p = b.dataset.pair.split("-");
        state.from = entryFor(p[0]); state.to = entryFor(p[1]); state.touched = true;
        fromCombo.show(state.from); toCombo.show(state.to);
        update();
        $("#cv-result").scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    });
    $("#share-copy").addEventListener("click", function () {
      copy(this.dataset.url || location.href);
    });
    root.classList.remove("is-loading");
    update();
  }

  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast(T.copied); }, function () { toast(T.copyFailed); });
    } else {
      var ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); toast(T.copied); } catch (e) { toast(T.copyFailed); }
      ta.remove();
    }
  }

  /* ------------------------------------------------------------------
     5. EXTRAS GLOBALES (idioma, cookies, compartir web, ver en local)
     ------------------------------------------------------------------ */
  function initGlobal() {
    srStatus = $("#sr-status");

    // Guardar idioma elegido y conservar la conversión al cambiar de idioma
    document.querySelectorAll("a[data-lang]").forEach(function (a) {
      a.addEventListener("click", function () {
        try { localStorage.setItem("mce_lang", a.dataset.lang); } catch (e) { /* nada */ }
        if (location.search && $("#converter")) a.href = a.href.split("?")[0] + location.search;
      });
    });
    try { localStorage.setItem("mce_lang", T.lang); } catch (e) { /* nada */ }

    // Botón "Configurar cookies" del pie (usa el mensaje de Google)
    var cookieBtn = $("#cookie-settings");
    if (cookieBtn) cookieBtn.addEventListener("click", function () {
      if (window.googlefc && window.googlefc.callbackQueue && window.googlefc.showRevocationMessage) {
        window.googlefc.callbackQueue.push(window.googlefc.showRevocationMessage);
      } else { toast(T.cookieSettingsUnavailable); }
    });

    initInstall();

    var shareTool = $("#share-tool-copy");
    if (shareTool) shareTool.addEventListener("click", function () { copy(location.origin + location.pathname); });

    // Para poder abrir la web con doble clic en tu ordenador (sin servidor)
    if (location.protocol === "file:") {
      document.querySelectorAll("a[href]").forEach(function (a) {
        var h = a.getAttribute("href");
        if (!/^[a-z]+:|^#/.test(h) && /\/$/.test(h.split("?")[0])) a.setAttribute("href", h.replace(/\/(\?|$)/, "/index.html$1"));
      });
    }
  }

  /* ------------------------------------------------------------------
     6. INSTALAR COMO APP (PWA)
     ------------------------------------------------------------------ */
  function initInstall() {
    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register(new URL("../../sw.js", SCRIPT_URL).href).catch(function () { /* sin app */ });
      });
    }
    var card = $("#install-card");
    if (!card) return;
    var standalone = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone;
    var dismissed = false;
    try { dismissed = localStorage.getItem("mce_install_hidden") === "1"; } catch (e) { /* nada */ }
    if (standalone || dismissed) return;

    var btn = $("#install-btn"), ios = $("#install-ios");
    var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    var deferred = null;

    window.addEventListener("beforeinstallprompt", function (ev) {
      ev.preventDefault();
      deferred = ev;
      btn.hidden = false; ios.hidden = true; card.hidden = false;
    });
    if (isIOS) { ios.hidden = false; btn.hidden = true; card.hidden = false; }

    btn.addEventListener("click", function () {
      if (!deferred) return;
      deferred.prompt();
      deferred.userChoice.then(function () { deferred = null; card.hidden = true; });
    });
    $("#install-close").addEventListener("click", function () {
      card.hidden = true;
      try { localStorage.setItem("mce_install_hidden", "1"); } catch (e) { /* nada */ }
    });
    window.addEventListener("appinstalled", function () { card.hidden = true; });
  }

  /* Utilidades expuestas para pruebas desde la consola del navegador */
  window.MCE_TEST = { toScaled: toScaled, divRound: divRound, formatDec: formatDec, parseAmount: parseAmount, ONE: ONE, search: search, rateDecimals: rateDecimals };

  initGlobal();
  var root = $("#converter");
  if (root || document.querySelector("[data-live-rate], table[data-from]")) {
    loadRates().then(initConverter).catch(function () {
      if (root) { root.classList.remove("is-loading"); $("#res-main").textContent = T.offline.replace("{date}", "—"); }
    });
  }
})();
