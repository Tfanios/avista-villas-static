/* AVISTA - interactions: nav, scroll reveal, gallery lightbox, video modal */
(function(){
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var focusable = "a[href],button:not([disabled]),iframe,[tabindex]:not([tabindex='-1'])";
  var scrollLocks = 0;
  var lastDialogFocus = null;

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

  var carousel = document.getElementById("carousel");
  var origCards = carousel ? [].slice.call(carousel.querySelectorAll(".card")) : [];
  var galleryItems = origCards.map(function(c, i){
    var img = c.querySelector("img");
    var alt = img && img.alt ? img.alt : "Avista gallery image";
    c.dataset.idx = i;
    c.setAttribute("aria-label", "Open gallery image: " + alt);
    return {src:c.getAttribute("data-full") || (img ? img.src : ""), alt:alt};
  });
  var lb = document.getElementById("lb");
  var lbImg = lb ? lb.querySelector("img") : null;
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

  var down = false;
  var moved = false;
  var startX = 0;
  var startScroll = 0;
  var locked = false;
  var setW = 0;
  var suppressClick = false;

  if(carousel && origCards.length){
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
      openLb(Number(card.dataset.idx) || 0);
    });
  }

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
