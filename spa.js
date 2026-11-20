/* SHARMATRACK site — one-page app shell (kit v1.3 SK.stack).
   The marketing page is the hub screen, rendered from its own markup
   (#hub-tpl) — content, anchors and links unchanged. The Owner Edition
   (owner/) becomes an inner screen: fetched from its existing URL, its
   masthead + directory content and its search script run inside the
   screen. While the Owner screen is on top, the site's own stylesheet
   is disabled so the Owner page renders exactly as standalone (both
   sheets style header / .wrap). In-page anchors (#how, #crews, …) keep
   default behaviour; only "#/…" hashes are routes. No passcode, no
   data changes. Adapted from the tracker apps' proven router. */
(function () {
  "use strict";

  var CFG = {
    title: "SHARMATRACK",
    backLabel: "SHARMATRACK",
    logo: "assets/sharmatrack-app-icon.png",
    hubTemplate: "hub-tpl",
    /* the kit owns the header trail once SK.stack starts (setHeader
       replaces it), so the More button rides along in every setHeader
       call, identical markup so the kit does not re-render. The site is
       English only — no language globe. */
    trail: '<a class="sk-header__btn" href="#/more" id="spa-more-btn" aria-label="More"><svg class="sk-icon"><use href="#i-more"/></svg></a>'
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function logoHtml() {
    return '<a class="sk-header__logo" href="#/" aria-label="' + esc(CFG.title) + ' home"><img src="' + CFG.logo + '" alt="' + esc(CFG.title) + '"></a>';
  }
  function backLead(label, href) {
    return '<a class="sk-header__btn sk-header__back" href="' + href + '" data-back><svg class="sk-icon"><use href="#i-chevron-left"/></svg>' + esc(label) + "</a>";
  }
  function skeleton(title) {
    return '<div class="spa-skel"><h1 class="sk-title">' + esc(title) + '</h1>' +
      '<div class="sk-skel"></div><div class="sk-skel"></div><div class="sk-skel"></div></div>';
  }

  /* ---------- no-kit fallback: hub as a plain page, links stay real ---- */
  function fallback() {
    var tpl = document.getElementById(CFG.hubTemplate);
    var app = document.getElementById("app");
    if (tpl && app) app.appendChild(tpl.content.cloneNode(true));
  }

  if (!window.SK || !SK.stack) { fallback(); return; }

  var nav = SK.stack("#app", { lead: logoHtml(), title: CFG.title });
  var stackKeys = [""]; // route keys, root first ("" = hub)

  nav.root("hub", function (page) {
    var tpl = document.getElementById(CFG.hubTemplate);
    page.html(tpl ? tpl.innerHTML : "");
    page.setHeader({ lead: logoHtml(), title: CFG.title, trail: CFG.trail });
  });

  /* ---------- routing ---------- */
  function routeKey() {
    var h = location.hash || "#/";
    if (h.indexOf("#/") !== 0) return "";
    var k = h.slice(2);
    try { k = decodeURIComponent(k); } catch (e) {}
    return k;
  }
  function titleFor(key) {
    if (key === "more") return "More";
    if (key === "owner/") return "Owner Edition";
    var a = document.querySelector('a[href="#/' + key + '"]');
    if (a) {
      var t = (a.textContent || "").replace(/\s+/g, " ").trim();
      if (t) return t.length > 42 ? t.slice(0, 42) : t;
    }
    return key.replace(/\/$/, "").replace(/\.html$/, "").replace(/[-_]/g, " ");
  }
  /* While the Owner screen is on top, the site stylesheet steps aside. */
  function syncSiteCss() {
    var el = document.getElementById("site-css");
    if (!el) return;
    var top = stackKeys.length ? stackKeys[stackKeys.length - 1] : "";
    el.disabled = top === "owner/";
  }
  function syncFromHash() {
    var key = routeKey();
    var idx = stackKeys.indexOf(key);
    if (idx >= 0) {
      if (idx < stackKeys.length - 1) { nav.popTo(idx); stackKeys.length = idx + 1; }
      syncSiteCss();
      return;
    }
    if (!key) { nav.popTo(0); stackKeys.length = 1; syncSiteCss(); return; }
    pushScreen(key, {});
  }
  window.addEventListener("hashchange", syncFromHash);

  /* In-app links (hub cards, hub buttons) become stack navigation. */
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a || a.hasAttribute("data-back")) return;
    if (a.target && a.target !== "_self") return;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#" || /^(mailto:|tel:)/i.test(href)) return;
    var u;
    try { u = new URL(href, location.href); } catch (err) { return; }
    if (u.origin !== location.origin) return;
    var rel = appRel(u.pathname);
    if (rel == null) return;
    if (!/(\/|\.html)$/.test(rel)) return; /* pages only — files keep default behaviour */
    e.preventDefault();
    location.hash = "#/" + rel;
  });
  function appBase() {
    return location.pathname.replace(/[^/]*$/, "");
  }
  function appRel(pathname) {
    var base = appBase();
    if (pathname.indexOf(base) !== 0) return null;
    var rel = pathname.slice(base.length);
    if (rel === "index.html") rel = "";
    return rel;
  }

  /* ---------- screen loading ---------- */
  function pushScreen(key, opts) {
    var parentKey = stackKeys.length ? stackKeys[stackKeys.length - 1] : "";
    var parentHash = "#/" + parentKey;
    var parentLabel = parentKey ? titleFor(parentKey) : CFG.backLabel;
    var title = titleFor(key);
    stackKeys.push(key);
    nav.push("p:" + key, function (page) {
      page.html(skeleton(title));
      page.setHeader({ lead: backLead(parentLabel, parentHash), title: title, backHref: parentHash, trail: CFG.trail });
      if (key === "more") { buildMore(page, parentLabel, parentHash); return; }
      loadScreen(key, page, title, parentLabel, parentHash);
    }, opts);
  }

  /* More screen (built in the shell, no fetch): the kit Appearance switch
     lives here (kit v1.3, ROLLOUT 2i) — apps open LIGHT always; Dark is
     picked here and remembered on the device. Licenses and the
     "Developed by" credit sit in separate blocks (Steve's footer rule). */
  function buildMore(page, parentLabel, parentHash) {
    page.html(
      '<div class="sk-pagehead"><div><h1 class="sk-title">More</h1></div></div>' +
      '<div class="sk-h2"><span>Display</span></div>' +
      '<div class="sk-list" id="appearance"></div>' +
      '<div class="sk-space"></div>' +
      '<div class="sk-list"><div class="sk-row"><div class="sk-row__body"><div class="sk-row__title">Sharma Electric &amp; HVAC</div><div class="sk-row__sub">Lic. EC13013924 · CAC1823596</div></div></div></div>' +
      '<div class="spa-devfoot"><img src="' + CFG.logo + '" alt="SHARMATRACK"><div>Developed by Sanjay Sharma</div></div>'
    );
    page.setHeader({ lead: backLead(parentLabel, parentHash), title: "More", backHref: parentHash, trail: CFG.trail });
    if (window.SK && SK.scheme && SK.scheme.mountToggle) {
      var ap = document.getElementById("appearance");
      if (ap) SK.scheme.mountToggle(ap);
    }
  }

  function resolveRel(dir, v) {
    if (/^(https?:)?\/\//i.test(v) || /^(data:|mailto:|tel:|#|\/)/.test(v)) return v;
    var parts = (dir + v).split("/"), out = [];
    parts.forEach(function (p) {
      if (p === "..") out.pop();
      else if (p !== "." && p !== "") out.push(p);
    });
    return out.join("/") + (/\/$/.test(v) ? "/" : "");
  }

  function rewriteUrls(root, dir) {
    root.querySelectorAll("[src],[href]").forEach(function (el) {
      ["src", "href"].forEach(function (attr) {
        var v = el.getAttribute(attr);
        if (!v) return;
        el.setAttribute(attr, resolveRel(dir, v));
      });
    });
    /* internal page links become hash routes */
    root.querySelectorAll("a[href]").forEach(function (a) {
      if (a.target && a.target !== "_self") return;
      var v = a.getAttribute("href");
      if (!v || v.charAt(0) === "#" || /^(https?:)?\/\//i.test(v) || /^(mailto:|tel:|\/)/i.test(v)) return;
      if (/(\/|\.html)$/.test(v)) a.setAttribute("href", "#/" + v);
    });
  }

  function extract(doc, key) {
    var dir = key.indexOf("/") >= 0 ? key.replace(/[^/]*$/, "") : "";
    var rootAbs = location.pathname.replace(/[^/]*$/, "");
    var dirAbs = rootAbs + dir;
    /* Inline scripts run against the shell URL, so relative paths inside
       them ("../drawings/…" in the drawing viewers) are rebased first:
       "../" -> app root, "./" -> the screen's own directory. */
    function fixInline(text) {
      return text
        .replace(/(["'])\.\.\//g, "$1" + rootAbs)
        .replace(/(["'])\.\//g, "$1" + dirAbs);
    }
    /* scripts: whole document, in order; shell scripts skipped.
       Collected BEFORE any node moves — moving .wrap into a detached
       holder would take its inline scripts out of the document and the
       drawing-viewer script would never run. */
    var scripts = [];
    doc.querySelectorAll("script").forEach(function (s) {
      if (s.hasAttribute("data-spa-redirect")) return; /* standalone-page bounce: never run inside the app */
      var src = s.getAttribute("src");
      if (src) {
        if (/sharma-kit|sk-init/.test(src)) return;
        scripts.push({ src: resolveRel(dir, src) });
      } else if (s.textContent && s.textContent.trim()) {
        scripts.push({ text: fixInline(s.textContent) });
      }
    });
    var styles = "";
    doc.querySelectorAll("style").forEach(function (s) { styles += s.outerHTML; });
    /* page-scoped stylesheets ride along; the shell's own sheets are skipped */
    doc.querySelectorAll('link[rel="stylesheet"]').forEach(function (l) {
      var href = l.getAttribute("href") || "";
      if (/sharma-kit\.css|sk-bridge\.css/.test(href)) return;
      styles += '<link rel="stylesheet" href="' + resolveRel(dir, href) + '">';
    });
    var parts = [];
    var wrap = doc.querySelector(".wrap");
    var isJob = !!(wrap && wrap.hasAttribute("data-job"));
    /* the language bar is NOT carried into screens: one globe button in the
       shell header opens the language sheet (Steve's review, 2026-11-19) */
    if (isJob) {
      parts.push(wrap);
      var nb = doc.querySelector(".namebar");
      if (nb) parts.push(nb);
    } else if (doc.querySelector("main") && /\.html$/.test(key)) {
      parts.push(doc.querySelector("main"));
    } else {
      /* content pages (the Owner Edition): masthead + content, in order */
      var hd = doc.querySelector("header");
      if (hd && !hd.classList.contains("sk-header")) parts.push(hd);
      if (wrap) parts.push(wrap);
      else if (doc.querySelector("main")) parts.push(doc.querySelector("main"));
    }
    var holder = doc.createElement("div");
    parts.forEach(function (p) { holder.appendChild(p); });
    holder.querySelectorAll("script").forEach(function (s) { s.remove(); });
    rewriteUrls(holder, dir);
    var h1 = holder.querySelector("h1");
    return {
      html: styles + holder.innerHTML,
      scripts: scripts,
      isJob: isJob,
      title: h1 ? (h1.textContent || "").replace(/\s+/g, " ").trim() : ""
    };
  }

  function runScripts(list) {
    /* app.js adds a fresh lightbox per run; drop dead ones from popped screens */
    document.querySelectorAll(".lightbox").forEach(function (n) { n.remove(); });
    var chain = Promise.resolve();
    list.forEach(function (s) {
      chain = chain.then(function () {
        return new Promise(function (res) {
          var el = document.createElement("script");
          if (s.src) {
            el.src = s.src;
            el.onload = el.onerror = function () { res(); };
            document.body.appendChild(el);
          } else {
            el.textContent = s.text;
            document.body.appendChild(el);
            res();
          }
        });
      });
    });
    return chain;
  }

  function loadScreen(key, page, title, parentLabel, parentHash) {
    fetch(key, { credentials: "same-origin" })
      .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        var frag = extract(doc, key);
        page.html(frag.html);
        page.setHeader({
          lead: backLead(parentLabel, parentHash),
          title: frag.title || title,
          backHref: parentHash,
          trail: CFG.trail
        });
        syncSiteCss();
        if (frag.isJob) {
          page.refreshable(function () {
            if (window.__jobRefresh) return window.__jobRefresh();
            return Promise.resolve();
          });
        } else if (key === "owner/") {
          page.refreshable(function () { return loadScreen(key, page, title, parentLabel, parentHash); });
        }
        runScripts(frag.scripts);
      })
      .catch(function () {
        page.html('<div class="spa-err"><p class="sk-note">Could not load this page.</p>' +
          '<p><a class="sk-btn sk-btn--secondary" href="' + esc(key) + '">Open the standard page</a></p></div>');
      });
  }

  /* deep link: open straight into the requested screen */
  var startKey = routeKey();
  if (startKey) pushScreen(startKey, { initial: true, instant: true });
})();
