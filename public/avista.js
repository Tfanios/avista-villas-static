/* AVISTA - interactions: nav, scroll reveal, gallery lightbox, video modal */
(function(){
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var focusable = "a[href],button:not([disabled]),iframe,[tabindex]:not([tabindex='-1'])";
  var scrollLocks = 0;
  var lastDialogFocus = null;

  document.querySelectorAll("[data-hero-video]").forEach(function(video){
    video.addEventListener("error", function(){ video.hidden = true; }, true);

    var isMobile = window.matchMedia && window.matchMedia("(max-width: 767px)").matches;
    var playMobile = video.getAttribute("data-play-mobile") === "1";
    var saveData = navigator.connection && navigator.connection.saveData;
    // The poster image is already the LCP. Only load/play the video when it's worth it:
    // never on reduced-motion or data-saver, and on phones only if playOnMobile is set.
    if(reduceMotion || saveData) return;
    if(isMobile && !playMobile) return;

    var src = isMobile
      ? (video.getAttribute("data-video-mobile") || video.getAttribute("data-video-desktop"))
      : (video.getAttribute("data-video-desktop") || video.getAttribute("data-video-mobile"));
    if(!src) return;
    video.preload = "auto";
    video.src = src;
    var p = video.play();
    if(p && p.catch) p.catch(function(){ /* autoplay blocked: poster stays */ });
  });

  // Map facade: swap the static preview for the real Google Maps iframe on click,
  // so the heavy third-party embed never loads until the visitor asks for it.
  document.querySelectorAll("[data-map-facade]").forEach(function(btn){
    btn.addEventListener("click", function(){
      var src = btn.getAttribute("data-embed");
      if(!src) return;
      var iframe = document.createElement("iframe");
      iframe.src = src;
      iframe.title = btn.getAttribute("data-title") || "Map";
      iframe.loading = "lazy";
      iframe.referrerPolicy = "no-referrer-when-downgrade";
      iframe.className = "map-iframe";
      iframe.setAttribute("allowfullscreen", "");
      btn.replaceWith(iframe);
    });
  });

  function lockScroll(){
    scrollLocks += 1;
    document.body.style.overflow = "hidden";
  }

  function unlockScroll(){
    scrollLocks = Math.max(0, scrollLocks - 1);
    if(!scrollLocks) document.body.style.overflow = "";
  }

  function isOpen(el){
    return !!(el && el.classList.contains("open"));
  }

  function setDialogState(el, open){
    if(!el) return;
    el.classList.toggle("open", open);
    el.setAttribute("aria-hidden", open ? "false" : "true");
  }

  function getFocusable(container){
    return [].slice.call(container.querySelectorAll(focusable)).filter(function(el){
      return !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true";
    });
  }

  function focusFirst(container){
    var items = getFocusable(container);
    (items[0] || container).focus();
  }

  function trapFocus(e, container){
    if(e.key !== "Tab") return;
    var items = getFocusable(container);
    if(!items.length){
      e.preventDefault();
      container.focus();
      return;
    }
    var first = items[0];
    var last = items[items.length - 1];
    if(e.shiftKey && document.activeElement === first){
      e.preventDefault();
      last.focus();
    }else if(!e.shiftKey && document.activeElement === last){
      e.preventDefault();
      first.focus();
    }
  }

  var nav = document.getElementById("nav") || document.querySelector(".nav");
  var hero = document.querySelector(".hero");
  function onScroll(){
    if(!nav) return;
    var threshold = hero ? hero.offsetHeight - 90 : 120;
    nav.classList.toggle("solid", window.scrollY > threshold);
  }
  window.addEventListener("scroll", onScroll, {passive:true});
  onScroll();

  var menuBtn = document.querySelector("[data-nav-toggle]");
  var mobileNav = document.getElementById("mobile-nav");
  function openMenu(){
    if(!menuBtn || !mobileNav || isOpen(mobileNav)) return;
    mobileNav.hidden = false;
    mobileNav.classList.add("open");
    if(nav) nav.classList.add("menu-open");
    menuBtn.setAttribute("aria-expanded", "true");
    menuBtn.textContent = "Close";
    lockScroll();
    focusFirst(mobileNav);
  }

  function closeMenu(restoreFocus){
    if(!menuBtn || !mobileNav || !isOpen(mobileNav)) return;
    mobileNav.classList.remove("open");
    mobileNav.hidden = true;
    if(nav) nav.classList.remove("menu-open");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.textContent = "Menu";
    unlockScroll();
    if(restoreFocus !== false) menuBtn.focus();
  }

  if(menuBtn && mobileNav){
    menuBtn.addEventListener("click", function(){
      if(isOpen(mobileNav)) closeMenu(true);
      else openMenu();
    });
    mobileNav.querySelectorAll("a").forEach(function(a){
      a.addEventListener("click", function(){ closeMenu(false); });
    });
    document.addEventListener("click", function(e){
      if(!isOpen(mobileNav)) return;
      if((nav && nav.contains(e.target)) || mobileNav.contains(e.target)) return;
      closeMenu(false);
    });
  }

  var reveals = [].slice.call(document.querySelectorAll(".reveal"));
  if("IntersectionObserver" in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, {threshold:.14, rootMargin:"0px 0px -8% 0px"});
    reveals.forEach(function(el){ io.observe(el); });
  }else{
    reveals.forEach(function(el){ el.classList.add("in"); });
  }

  document.querySelectorAll("a[href^='#']").forEach(function(a){
    a.addEventListener("click", function(ev){
      var id = a.getAttribute("href");
      if(!id || id.length < 2) return;
      var t = document.querySelector(id);
      if(!t) return;
      ev.preventDefault();
      t.scrollIntoView({behavior:reduceMotion ? "auto" : "smooth", block:"start"});
      if(!t.hasAttribute("tabindex")) t.setAttribute("tabindex", "-1");
      try{ t.focus({preventScroll:true}); }catch(err){ t.focus(); }
    });
  });

  var lb = document.getElementById("lb");
  var lbScroll = lb ? lb.querySelector("[data-lb-scroll]") : null;
  var lbCur = lb ? lb.querySelector("[data-lb-cur]") : null;
  var lbTotal = lb ? lb.querySelector("[data-lb-total]") : null;
  var galleryItems = [];
  var figureEls = [];
  var cur = 0;
  var builtScroll = false;

  function setCur(i){
    cur = Math.max(0, Math.min(figureEls.length - 1, i));
    if(lbCur) lbCur.textContent = String(cur + 1);
  }

  // Build the scrollable photo column on first open, so the large images only
  // start loading once the viewer is actually used.
  function buildScroll(){
    if(builtScroll || !lbScroll) return;
    builtScroll = true;
    figureEls = [];
    var frag = document.createDocumentFragment();
    galleryItems.forEach(function(item, i){
      var fig = document.createElement("figure");
      fig.className = "lb-figure";
      fig.dataset.idx = i;
      var im = document.createElement("img");
      im.src = item.src;
      im.alt = item.alt;
      im.loading = i < 2 ? "eager" : "lazy";
      im.decoding = "async";
      fig.appendChild(im);
      if(item.alt){
        var cap = document.createElement("figcaption");
        cap.className = "lb-cap";
        cap.textContent = item.alt;
        fig.appendChild(cap);
      }
      frag.appendChild(fig);
      figureEls.push(fig);
    });
    lbScroll.appendChild(frag);
    if(lbTotal) lbTotal.textContent = String(galleryItems.length);

    // Keep the counter in sync with whichever photo fills the viewport.
    if("IntersectionObserver" in window){
      var ratios = [];
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(en){ ratios[Number(en.target.dataset.idx)] = en.intersectionRatio; });
        var best = -1, bi = cur;
        for(var i = 0; i < figureEls.length; i++){
          var r = ratios[i] || 0;
          if(r > best){ best = r; bi = i; }
        }
        if(bi !== cur) setCur(bi);
      }, {root: lbScroll, threshold:[.25,.5,.75,1]});
      figureEls.forEach(function(f){ io.observe(f); });
    }
  }

  function goTo(i, smooth){
    if(!figureEls.length) return;
    setCur(i);
    figureEls[cur].scrollIntoView({behavior: (smooth && !reduceMotion) ? "smooth" : "auto", block:"start"});
  }

  function openLb(i){
    if(!lb || !galleryItems.length) return;
    closeMenu(false);
    buildScroll();
    lastDialogFocus = document.activeElement;
    setDialogState(lb, true);
    lockScroll();
    setCur(i || 0);
    // Jump to the chosen photo before the modal paints, then hand focus to the
    // scroll region so keyboard scrolling works immediately.
    requestAnimationFrame(function(){
      if(figureEls[cur]) figureEls[cur].scrollIntoView({behavior:"auto", block:"start"});
      if(lbScroll) lbScroll.focus(); else focusFirst(lb);
    });
  }

  function closeLb(restoreFocus){
    if(!isOpen(lb)) return;
    setDialogState(lb, false);
    unlockScroll();
    if(restoreFocus !== false && lastDialogFocus && document.contains(lastDialogFocus)) lastDialogFocus.focus();
  }

  // ---- All-photos grid modal (Airbnb-style), shown before the scroll viewer ----
  var gm = document.getElementById("gallery-modal");
  var gmGrid = gm ? gm.querySelector("[data-gm-grid]") : null;
  var gmReturnFocus = null;
  var builtGrid = false;

  function buildGrid(){
    if(builtGrid || !gmGrid) return;
    builtGrid = true;
    var frag = document.createDocumentFragment();
    galleryItems.forEach(function(item, i){
      var b = document.createElement("button");
      b.type = "button";
      b.className = "gm-item";
      b.setAttribute("aria-label", "Open photo " + (i + 1) + (item.alt ? ": " + item.alt : ""));
      var im = document.createElement("img");
      im.src = item.thumb || item.src;
      im.alt = item.alt;
      im.loading = "lazy";
      im.decoding = "async";
      b.appendChild(im);
      b.addEventListener("click", function(){ openLb(i); });
      frag.appendChild(b);
    });
    gmGrid.appendChild(frag);
  }

  function openGallery(){
    if(!gm || !galleryItems.length) return;
    closeMenu(false);
    buildGrid();
    gmReturnFocus = document.activeElement;
    setDialogState(gm, true);
    lockScroll();
    gm.scrollTop = 0;
    requestAnimationFrame(function(){ focusFirst(gm); });
  }

  function closeGallery(restoreFocus){
    if(!isOpen(gm)) return;
    setDialogState(gm, false);
    unlockScroll();
    if(restoreFocus !== false && gmReturnFocus && document.contains(gmReturnFocus)) gmReturnFocus.focus();
  }

  // Shared infinite drag-to-scroll carousel. Used by the gallery (cards open the
  // lightbox) and the reviews slider (onCardActivate omitted, so cards do nothing).
  function initCarousel(carousel, onCardActivate){
    var origCards = [].slice.call(carousel.querySelectorAll(".card"));
    if(!origCards.length) return;
    var down = false, moved = false, startX = 0, startScroll = 0, locked = false, setW = 0, suppressClick = false, pressCard = null;

    var before = document.createDocumentFragment();
    var after = document.createDocumentFragment();
    function cloneCard(c){
      var k = c.cloneNode(true);
      k.classList.add("clone");
      k.setAttribute("aria-hidden", "true");
      k.tabIndex = -1;
      return k;
    }
    origCards.forEach(function(c){ before.appendChild(cloneCard(c)); });
    origCards.forEach(function(c){ after.appendChild(cloneCard(c)); });
    carousel.insertBefore(before, origCards[0]);
    carousel.appendChild(after);
    var allCards = [].slice.call(carousel.querySelectorAll(".card"));

    function recalc(){
      if(!origCards[0] || !allCards[0]) return;
      setW = origCards[0].offsetLeft - allCards[0].offsetLeft;
      if(setW > 0) carousel.scrollLeft = setW;
    }

    function normalize(){
      if(locked || !setW) return;
      if(carousel.scrollLeft < setW * 0.5) carousel.scrollLeft += setW;
      else if(carousel.scrollLeft > setW * 1.5) carousel.scrollLeft -= setW;
    }

    setTimeout(recalc, 60);
    window.addEventListener("load", recalc);
    window.addEventListener("resize", recalc);
    carousel.addEventListener("scroll", normalize, {passive:true});

    carousel.addEventListener("pointerdown", function(e){
      if(e.button && e.button !== 0) return;
      down = true;
      moved = false;
      locked = true;
      startX = e.clientX;
      startScroll = carousel.scrollLeft;
      // Capture the pressed card now: setPointerCapture redirects the mouse's
      // compatibility click to the carousel, so we can't rely on the click target.
      pressCard = e.target.closest ? e.target.closest(".card") : null;
      if(carousel.setPointerCapture) carousel.setPointerCapture(e.pointerId);
    });
    carousel.addEventListener("pointermove", function(e){
      if(!down) return;
      var dx = e.clientX - startX;
      if(Math.abs(dx) > 5){
        moved = true;
        carousel.classList.add("dragging");
      }
      carousel.scrollLeft = startScroll - dx;
    });
    function endDrag(){
      if(!down) return;
      suppressClick = moved;
      down = false;
      locked = false;
      normalize();
      setTimeout(function(){
        suppressClick = false;
        carousel.classList.remove("dragging");
      }, 40);
    }
    carousel.addEventListener("pointerup", function(e){
      var wasDrag = moved;
      var card = pressCard;
      endDrag();
      // Activate on pointerup (not click): pointer capture sends the click to the
      // carousel, so the click target can't be trusted for mouse/touch.
      if(!wasDrag && onCardActivate && card && !card.classList.contains("clone")){
        onCardActivate(card);
      }
      pressCard = null;
    });
    carousel.addEventListener("pointercancel", function(){ pressCard = null; endDrag(); });
    carousel.addEventListener("pointerleave", endDrag);
    // Keyboard only: Enter/Space on a focused card fires a click with detail 0 and
    // no pointer sequence. Mouse/touch are handled in pointerup above.
    carousel.addEventListener("click", function(e){
      if(e.detail !== 0) return;
      var card = e.target.closest(".card");
      if(!card || card.classList.contains("clone")) return;
      if(onCardActivate) onCardActivate(card);
    });
  }

  var gallery = document.getElementById("carousel");
  if(gallery){
    galleryItems = [].slice.call(gallery.querySelectorAll(".card")).map(function(c, i){
      var img = c.querySelector("img");
      var alt = img && img.alt ? img.alt : "";
      c.dataset.idx = i;
      c.setAttribute("aria-label", "Open gallery image: " + alt);
      return {src:c.getAttribute("data-full") || (img ? img.src : ""), thumb: c.getAttribute("data-thumb") || (img ? img.src : ""), alt:alt};
    });
    initCarousel(gallery, function(card){
      var i = Number(card.dataset.idx) || 0;
      // Open the all-photos grid first (Airbnb style) on every screen size, so
      // mobile behaves like desktop. Falls back to the scroll viewer only if the
      // grid modal isn't on the page.
      if(gm) openGallery();
      else openLb(i);
    });
  }

  [].slice.call(document.querySelectorAll(".carousel")).forEach(function(el){
    if(el === gallery) return;
    initCarousel(el, null);
  });

  if(lb){
    var lbClose = lb.querySelector("[data-close-lightbox]");
    if(lbClose) lbClose.addEventListener("click", function(){ closeLb(true); });
    // Click the empty area beside a photo (not the photo, caption, or bar) to close.
    lb.addEventListener("click", function(e){
      if(e.target.tagName === "IMG") return;
      if(e.target.closest(".lb-bar") || e.target.closest(".lb-cap")) return;
      closeLb(true);
    });
  }

  if(gm){
    var gmClose = gm.querySelector("[data-close-gallery]");
    if(gmClose) gmClose.addEventListener("click", function(){ closeGallery(true); });
  }

  var modal = document.getElementById("film");
  var frame = modal ? modal.querySelector("iframe") : null;
  var filmSrc = modal ? modal.getAttribute("data-src") : "";
  function openFilm(){
    if(!modal) return;
    closeMenu(false);
    lastDialogFocus = document.activeElement;
    if(frame && filmSrc) frame.src = filmSrc;
    setDialogState(modal, true);
    lockScroll();
    focusFirst(modal);
  }

  function closeFilm(restoreFocus){
    if(!isOpen(modal)) return;
    setDialogState(modal, false);
    if(frame) frame.src = "";
    unlockScroll();
    if(restoreFocus !== false && lastDialogFocus && document.contains(lastDialogFocus)) lastDialogFocus.focus();
  }

  document.querySelectorAll("[data-film]").forEach(function(b){
    b.addEventListener("click", openFilm);
  });
  if(modal){
    var filmClose = modal.querySelector("[data-close-film]");
    if(filmClose) filmClose.addEventListener("click", function(){ closeFilm(true); });
    modal.addEventListener("click", function(e){ if(e.target === modal) closeFilm(true); });
  }

  document.addEventListener("keydown", function(e){
    // Topmost dialog first: video modal > scroll viewer > all-photos grid.
    var activeDialog = isOpen(modal) ? modal : (isOpen(lb) ? lb : (isOpen(gm) ? gm : null));
    if(e.key === "Escape"){
      if(activeDialog === modal) closeFilm(true);
      else if(activeDialog === lb) closeLb(true);
      else if(activeDialog === gm) closeGallery(true);
      else if(isOpen(mobileNav)) closeMenu(true);
      return;
    }
    if(activeDialog) trapFocus(e, activeDialog);
    if(isOpen(lb)){
      if(e.key === "ArrowRight" || e.key === "ArrowDown"){ e.preventDefault(); goTo(cur + 1, true); }
      else if(e.key === "ArrowLeft" || e.key === "ArrowUp"){ e.preventDefault(); goTo(cur - 1, true); }
      else if(e.key === "Home"){ e.preventDefault(); goTo(0, false); }
      else if(e.key === "End"){ e.preventDefault(); goTo(figureEls.length - 1, false); }
    }
  });
})();

/* ---- live weather widget ---- */
(function(){
  var nodes = document.querySelectorAll("[data-weather]");
  if(!nodes.length || !window.fetch) return;
  var root = document.body;
  var latitude = root.getAttribute("data-weather-latitude");
  var longitude = root.getAttribute("data-weather-longitude");
  var locationLabel = root.getAttribute("data-weather-label") || "";
  if(!latitude || !longitude) return;

  var S = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">';
  var ICONS = {
    sun:    S + '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    part:   S + '<circle cx="8.5" cy="7.5" r="2.6"/><path d="M8.5 2.7v1.1M4.4 7.5H3.3M5.6 4.6l-.8-.8M12.2 4.6l-.8-.8"/><path d="M17 20H9.5A4.2 4.2 0 0 1 9 11.7 5 5 0 0 1 18.6 13 3.4 3.4 0 0 1 17 20z"/></svg>',
    cloud:  S + '<path d="M17.5 19H8a4.5 4.5 0 0 1 .3-9A6 6 0 0 1 20 11.5a3.75 3.75 0 0 1-2.5 7.5z"/></svg>',
    fog:    S + '<path d="M17.5 13H8a4.5 4.5 0 0 1 .3-9A6 6 0 0 1 20 5.5a3.75 3.75 0 0 1-2.5 7.5z"/><path d="M5 18h14M7 21h10"/></svg>',
    rain:   S + '<path d="M17.5 15H8a4.5 4.5 0 0 1 .3-9A6 6 0 0 1 20 7.5a3.75 3.75 0 0 1-2.5 7.5z"/><path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2"/></svg>',
    snow:   S + '<path d="M17.5 14H8a4.5 4.5 0 0 1 .3-9A6 6 0 0 1 20 6.5a3.75 3.75 0 0 1-2.5 7.5z"/><path d="M8 19h.01M12 20h.01M16 19h.01M10 18h.01M14 18h.01"/></svg>',
    storm:  S + '<path d="M17.5 13H8a4.5 4.5 0 0 1 .3-9A6 6 0 0 1 20 5.5a3.75 3.75 0 0 1-2.5 7.5z"/><path d="M12 13l-2 4h3l-2 4"/></svg>'
  };

  function pick(code){
    if(code === 0) return ["sun","Clear"];
    if(code === 1 || code === 2) return ["part","Partly cloudy"];
    if(code === 3) return ["cloud","Overcast"];
    if(code === 45 || code === 48) return ["fog","Fog"];
    if(code >= 51 && code <= 67) return ["rain","Rain"];
    if(code >= 71 && code <= 77) return ["snow","Snow"];
    if(code >= 80 && code <= 82) return ["rain","Showers"];
    if(code === 85 || code === 86) return ["snow","Snow showers"];
    if(code >= 95) return ["storm","Thunderstorm"];
    return ["cloud","Cloudy"];
  }

  var url = "https://api.open-meteo.com/v1/forecast?latitude=" +
    encodeURIComponent(latitude) + "&longitude=" + encodeURIComponent(longitude) +
    "&current=temperature_2m,weather_code&timezone=auto";
  fetch(url).then(function(r){ return r.ok ? r.json() : null; }).then(function(d){
    if(!d || !d.current || typeof d.current.temperature_2m !== "number") return;
    var t = Math.round(d.current.temperature_2m);
    var info = pick(d.current.weather_code);
    nodes.forEach(function(n){
      var ic = n.querySelector(".nav-weather-ic");
      var tm = n.querySelector(".nav-weather-temp");
      if(ic) ic.innerHTML = ICONS[info[0]] || ICONS.cloud;
      if(tm) tm.textContent = t + "°";
      n.setAttribute(
        "aria-label",
        (locationLabel ? locationLabel + ": " : "") + info[1] + ", " + t + "°C"
      );
      n.hidden = false;
    });
  }).catch(function(){ /* offline / blocked — leave widget hidden */ });
})();
