/* AVISTA - interactions: nav, scroll reveal, gallery lightbox, video modal */
(function(){
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var focusable = "a[href],button:not([disabled]),iframe,[tabindex]:not([tabindex='-1'])";
  var scrollLocks = 0;
  var lastDialogFocus = null;

  document.querySelectorAll("[data-hero-video]").forEach(function(video){
    video.addEventListener("error", function(){
      video.hidden = true;
    }, true);

    if(reduceMotion){
      video.removeAttribute("autoplay");
      try{ video.pause(); }catch(err){}
    }
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
  var lbImg = lb ? lb.querySelector("img") : null;
  var galleryItems = [];
  var cur = 0;

  function show(i){
    if(!galleryItems.length || !lbImg) return;
    cur = (i + galleryItems.length) % galleryItems.length;
    lbImg.src = galleryItems[cur].src;
    lbImg.alt = galleryItems[cur].alt;
  }

  function openLb(i){
    if(!lb || !galleryItems.length) return;
    closeMenu(false);
    lastDialogFocus = document.activeElement;
    show(i);
    setDialogState(lb, true);
    lockScroll();
    focusFirst(lb);
  }

  function closeLb(restoreFocus){
    if(!isOpen(lb)) return;
    setDialogState(lb, false);
    if(lbImg) lbImg.removeAttribute("src");
    unlockScroll();
    if(restoreFocus !== false && lastDialogFocus && document.contains(lastDialogFocus)) lastDialogFocus.focus();
  }

  // Shared infinite drag-to-scroll carousel. Used by the gallery (cards open the
  // lightbox) and the reviews slider (onCardActivate omitted, so cards do nothing).
  function initCarousel(carousel, onCardActivate){
    var origCards = [].slice.call(carousel.querySelectorAll(".card"));
    if(!origCards.length) return;
    var down = false, moved = false, startX = 0, startScroll = 0, locked = false, setW = 0, suppressClick = false;

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
    carousel.addEventListener("pointerup", endDrag);
    carousel.addEventListener("pointercancel", endDrag);
    carousel.addEventListener("pointerleave", endDrag);
    carousel.addEventListener("click", function(e){
      var card = e.target.closest(".card");
      if(!card || card.classList.contains("clone")) return;
      if(suppressClick){
        e.preventDefault();
        return;
      }
      if(onCardActivate) onCardActivate(card);
    });
  }

  var gallery = document.getElementById("carousel");
  if(gallery){
    galleryItems = [].slice.call(gallery.querySelectorAll(".card")).map(function(c, i){
      var img = c.querySelector("img");
      var alt = img && img.alt ? img.alt : "Avista gallery image";
      c.dataset.idx = i;
      c.setAttribute("aria-label", "Open gallery image: " + alt);
      return {src:c.getAttribute("data-full") || (img ? img.src : ""), alt:alt};
    });
    initCarousel(gallery, function(card){ openLb(Number(card.dataset.idx) || 0); });
  }

  [].slice.call(document.querySelectorAll(".carousel")).forEach(function(el){
    if(el === gallery) return;
    initCarousel(el, null);
  });

  if(lb){
    var lbClose = lb.querySelector("[data-close-lightbox]");
    var lbPrev = lb.querySelector(".prev");
    var lbNext = lb.querySelector(".next");
    if(lbClose) lbClose.addEventListener("click", function(){ closeLb(true); });
    if(lbPrev) lbPrev.addEventListener("click", function(e){ e.stopPropagation(); show(cur - 1); });
    if(lbNext) lbNext.addEventListener("click", function(e){ e.stopPropagation(); show(cur + 1); });
    lb.addEventListener("click", function(e){ if(e.target === lb) closeLb(true); });
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
    var activeDialog = isOpen(modal) ? modal : (isOpen(lb) ? lb : null);
    if(e.key === "Escape"){
      if(activeDialog === modal) closeFilm(true);
      else if(activeDialog === lb) closeLb(true);
      else if(isOpen(mobileNav)) closeMenu(true);
      return;
    }
    if(activeDialog) trapFocus(e, activeDialog);
    if(isOpen(lb)){
      if(e.key === "ArrowLeft") show(cur - 1);
      if(e.key === "ArrowRight") show(cur + 1);
    }
  });
})();

/* ---- live weather widget (Vourvourou) ---- */
(function(){
  var nodes = document.querySelectorAll("[data-weather]");
  if(!nodes.length || !window.fetch) return;

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

  var url = "https://api.open-meteo.com/v1/forecast?latitude=40.1969&longitude=23.7761&current=temperature_2m,weather_code&timezone=auto";
  fetch(url).then(function(r){ return r.ok ? r.json() : null; }).then(function(d){
    if(!d || !d.current || typeof d.current.temperature_2m !== "number") return;
    var t = Math.round(d.current.temperature_2m);
    var info = pick(d.current.weather_code);
    nodes.forEach(function(n){
      var ic = n.querySelector(".nav-weather-ic");
      var tm = n.querySelector(".nav-weather-temp");
      if(ic) ic.innerHTML = ICONS[info[0]] || ICONS.cloud;
      if(tm) tm.textContent = t + "°";
      n.setAttribute("aria-label", "Vourvourou: " + info[1] + ", " + t + "°C");
      n.hidden = false;
    });
  }).catch(function(){ /* offline / blocked — leave widget hidden */ });
})();
