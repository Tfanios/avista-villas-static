/* AVISTA — interactions: nav scroll state, scroll reveal, gallery lightbox, video modal */
(function(){
  "use strict";

  /* nav solid on scroll */
  var nav = document.querySelector('.nav');
  var hero = document.querySelector('.hero');
  function onScroll(){
    var threshold = hero ? hero.offsetHeight - 90 : 120;
    if(window.scrollY > threshold) nav.classList.add('solid');
    else nav.classList.remove('solid');
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();

  /* scroll reveal */
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, {threshold:.14, rootMargin:'0px 0px -8% 0px'});
  document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });

  /* smooth anchor scroll */
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(ev){
      var id = a.getAttribute('href');
      if(id.length < 2) return;
      var t = document.querySelector(id);
      if(t){ ev.preventDefault(); t.scrollIntoView({behavior:'smooth', block:'start'}); }
    });
  });

  /* ---- gallery: INFINITE carousel — drag + arrows + lightbox ---- */
  var carousel = document.getElementById('carousel');
  var origCards = carousel ? [].slice.call(carousel.querySelectorAll('.card')) : [];
  var srcs = origCards.map(function(c){ var i=c.querySelector('img'); return c.getAttribute('data-full')||i.src; });
  var lb = document.getElementById('lb');
  var lbImg = lb ? lb.querySelector('img') : null;
  var cur = 0;
  function show(i){ cur=(i+srcs.length)%srcs.length; lbImg.src=srcs[cur]; }
  function openLb(i){ show(i); lb.classList.add('open'); document.body.style.overflow='hidden'; }
  function closeLb(){ lb.classList.remove('open'); document.body.style.overflow=''; }

  var down=false, moved=false, startX=0, startScroll=0, locked=false, setW=0;
  if(carousel && origCards.length){

    /* build the loop: [clones][originals][clones] */
    origCards.forEach(function(c,i){ c.dataset.idx=i; });
    var before=document.createDocumentFragment(), after=document.createDocumentFragment();
    origCards.forEach(function(c){ var k=c.cloneNode(true); k.classList.add('clone'); before.appendChild(k); });
    origCards.forEach(function(c){ var k=c.cloneNode(true); k.classList.add('clone'); after.appendChild(k); });
    carousel.insertBefore(before, origCards[0]);
    carousel.appendChild(after);
    var allCards=[].slice.call(carousel.querySelectorAll('.card'));

    function recalc(){
      setW = origCards[0].offsetLeft - allCards[0].offsetLeft;
      carousel.scrollLeft = setW;
    }
    function cardStep(){ return allCards[1].offsetLeft - allCards[0].offsetLeft; }
    function normalize(){
      if(locked || !setW) return;
      if(carousel.scrollLeft < setW*0.5) carousel.scrollLeft += setW;
      else if(carousel.scrollLeft > setW*1.5) carousel.scrollLeft -= setW;
    }

    setTimeout(recalc, 60);
    window.addEventListener('load', recalc);
    window.addEventListener('resize', recalc);
    carousel.addEventListener('scroll', normalize, {passive:true});

    /* autoplay drift */
    var auto=true, downCard=null;
    function tick(){
      if(auto && !down && lb && !lb.classList.contains('open')){
        carousel.scrollLeft += 0.6; normalize();
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    /* drag + tap-to-open (capture-safe: open on pointerup, not click) */
    carousel.addEventListener('pointerdown', function(e){
      down=true; moved=false; locked=true; startX=e.clientX; startScroll=carousel.scrollLeft;
      downCard=e.target.closest('.card');
      carousel.setPointerCapture(e.pointerId);
    });
    carousel.addEventListener('pointermove', function(e){
      if(!down) return;
      var dx=e.clientX-startX;
      if(Math.abs(dx)>5){ moved=true; carousel.classList.add('dragging'); }
      carousel.scrollLeft=startScroll-dx;
    });
    function endDrag(){ if(!down) return; down=false; locked=false;
      if(!moved && downCard) openLb(+downCard.dataset.idx);
      downCard=null; normalize();
      setTimeout(function(){ carousel.classList.remove('dragging'); },40);
    }
    carousel.addEventListener('pointerup', endDrag);
    carousel.addEventListener('pointercancel', endDrag);

    /* hover pauses the drift; leaving resumes (and ends any drag) */
    carousel.addEventListener('pointerenter', function(){ auto=false; });
    carousel.addEventListener('pointerleave', function(){ auto=true; endDrag(); });
  }

  if(lb){
    lb.querySelector('.x').addEventListener('click', closeLb);
    lb.querySelector('.prev').addEventListener('click', function(e){ e.stopPropagation(); show(cur-1); });
    lb.querySelector('.next').addEventListener('click', function(e){ e.stopPropagation(); show(cur+1); });
    lb.addEventListener('click', function(e){ if(e.target===lb) closeLb(); });
  }

  /* ---- video modal ---- */
  var modal = document.getElementById('film');
  var frame = modal ? modal.querySelector('iframe') : null;
  var FILM = modal ? modal.getAttribute('data-src') : '';
  function openFilm(){ if(frame) frame.src = FILM; modal.classList.add('open'); document.body.style.overflow='hidden'; }
  function closeFilm(){ modal.classList.remove('open'); if(frame) frame.src=''; document.body.style.overflow=''; }
  document.querySelectorAll('[data-film]').forEach(function(b){ b.addEventListener('click', openFilm); });
  if(modal){
    modal.querySelector('.x').addEventListener('click', closeFilm);
    modal.addEventListener('click', function(e){ if(e.target===modal) closeFilm(); });
  }

  /* keyboard */
  document.addEventListener('keydown', function(e){
    if(e.key==='Escape'){ closeLb(); closeFilm(); }
    if(lb && lb.classList.contains('open')){
      if(e.key==='ArrowLeft') show(cur-1);
      if(e.key==='ArrowRight') show(cur+1);
    }
  });
})();
