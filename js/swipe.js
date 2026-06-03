/* ============================================================
   VIDYA STEM – Swipe Engine
   js/swipe.js  |  v3.0.0

   Gesture map:
     → Right  = Well Present  ✅
     ← Left   = Broken        🟡
     ↑ Up     = Missing       🔴
     ↓ Down   = Undo

   Public API:
     swipeEngine.start(items, labMeta, onComplete)
     swipeEngine.decide(status)
     swipeEngine.undo()
     swipeEngine.submit()
   ============================================================ */

const swipeEngine = {
  _items:      [],
  _decisions:  [],
  _idx:        0,
  _onComplete: null,
  _labMeta:    null,
  _sx: 0, _sy: 0, _dragging: false,

  /* ─── Start audit ─── */
  start: function (items, labMeta, onComplete) {
    this._items      = items;
    this._decisions  = [];
    this._idx        = 0;
    this._onComplete = onComplete;
    this._labMeta    = labMeta;

    document.getElementById('sw-btn-broken') .onclick = () => this.decide('Broken');
    document.getElementById('sw-btn-undo')   .onclick = () => this.undo();
    document.getElementById('sw-btn-missing').onclick = () => this.decide('Missing');
    document.getElementById('sw-btn-present').onclick = () => this.decide('Well Present');

    document.getElementById('sw-lab-name').textContent  = labMeta.name || '';
    document.getElementById('sw-progress-total').textContent = items.length;

    this._updateProgress();
    this._renderDeck();
    app.switchView('swipe-audit-view');
  },

  /* ─── Build card stack ─── */
  _renderDeck: function () {
    const stage = document.getElementById('sw-stage');
    stage.querySelectorAll('.swipe-card').forEach(c => c.remove());

    const empty = document.getElementById('sw-empty');
    if (this._idx >= this._items.length) {
      empty.style.display = 'flex';
      const btn = document.getElementById('sw-submit-btn');
      btn.disabled = false;
      btn.classList.add('ready');
      return;
    }
    empty.style.display = 'none';

    const count = Math.min(3, this._items.length - this._idx);
    for (let i = count - 1; i >= 0; i--) {
      const item = this._items[this._idx + i];
      const card = this._makeCard(item, i === 0);
      stage.insertBefore(card, empty);
    }
  },

  /* ─── Build single card ─── */
  _makeCard: function (item, isTop) {
    const card = document.createElement('div');
    card.className = 'swipe-card' + (isTop ? ' swipe-card--top' : '');

    const imgSrc = item.img || '';
    const price  = item.price != null ? `₹${Number(item.price).toLocaleString('en-IN')}` : '';
    const qty    = item.quantity > 1 ? `Qty: ${item.quantity}` : '';

    const overlays = isTop ? `
      <div class="swipe-overlay swipe-overlay--right"><i class="fa-solid fa-circle-check"></i><span>Present</span></div>
      <div class="swipe-overlay swipe-overlay--left"><i class="fa-solid fa-circle-exclamation"></i><span>Broken</span></div>
      <div class="swipe-overlay swipe-overlay--up"><i class="fa-solid fa-circle-xmark"></i><span>Missing</span></div>
      <div class="swipe-overlay swipe-overlay--down"><i class="fa-solid fa-rotate-left"></i><span>Undo</span></div>
    ` : '';

    card.innerHTML = `
      ${overlays}
      <div class="swipe-card-img-wrap">
        ${imgSrc
          ? `<img src="${imgSrc}" class="swipe-card-img" alt="${item.name}"
               onerror="this.outerHTML='<div class=\\'swipe-img-ph\\'><i class=\\'fa-solid fa-box-open\\'></i></div>'">`
          : `<div class="swipe-img-ph"><i class="fa-solid fa-box-open"></i></div>`}
        ${qty ? `<span class="swipe-qty-badge">${qty}</span>` : ''}
      </div>
      <div class="swipe-card-body">
        <div class="swipe-card-cat">${item.category || ''}</div>
        <h2 class="swipe-item-name">${item.name}</h2>
        <p class="swipe-item-desc">${item.description || ''}</p>
        <div class="swipe-item-footer">
          ${price ? `<span class="swipe-item-price">${price}</span>` : ''}
          ${item.code ? `<span class="swipe-item-code">${item.code}</span>` : ''}
        </div>
      </div>
    `;

    if (isTop) this._attachGestures(card);
    return card;
  },

  /* ─── Gesture handling ─── */
  _attachGestures: function (card) {
    const T = APP_CONFIG.swipe.threshold;

    card.style.touchAction = 'none'; // hint for modern browsers
    
    let startX = 0, startY = 0;
    let dragging = false;

    const onStart = (x, y) => {
      startX = x; startY = y; dragging = true;
      card.style.transition = 'none';
    };

    const onMove = (x, y) => {
      if (!dragging) return;
      const dx = x - startX, dy = y - startY;
      card.style.transform = `translate(${dx}px,${dy}px) rotate(${dx * 0.05}deg)`;
      
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      
      card.querySelector('.swipe-overlay--right')?.classList.toggle('visible', dx > T && absDx > absDy);
      card.querySelector('.swipe-overlay--left') ?.classList.toggle('visible', dx < -T && absDx > absDy);
      card.querySelector('.swipe-overlay--up')   ?.classList.toggle('visible', dy < -T && absDy > absDx);
      card.querySelector('.swipe-overlay--down') ?.classList.toggle('visible', dy > T && absDy > absDx);
    };

    const onEnd = (x, y) => {
      if (!dragging) return;
      dragging = false;
      const dx = x - startX, dy = y - startY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      
      if (absDx > absDy) {
        if (dx > T) this.decide('Well Present');
        else if (dx < -T) this.decide('Broken');
        else this._snapBack(card);
      } else {
        if (dy < -T) this.decide('Missing');
        else if (dy > T) this.undo();
        else this._snapBack(card);
      }
    };

    // --- Touch ---
    card.addEventListener('touchstart', e => {
      const t = e.touches[0];
      onStart(t.clientX, t.clientY);
    }, {passive: true});

    card.addEventListener('touchmove', e => {
      if (!dragging) return;
      e.preventDefault(); // Stop page scroll
      const t = e.touches[0];
      onMove(t.clientX, t.clientY);
    }, {passive: false});

    card.addEventListener('touchend', e => {
      if (!dragging) return;
      const t = e.changedTouches[0];
      onEnd(t.clientX, t.clientY);
    });

    // --- Mouse ---
    const mm = e => { if (dragging) onMove(e.clientX, e.clientY); };
    const mu = e => {
      if (dragging) onEnd(e.clientX, e.clientY);
      window.removeEventListener('mousemove', mm);
      window.removeEventListener('mouseup', mu);
    };
    
    card.addEventListener('mousedown', e => {
      e.preventDefault(); // Prevent native image dragging
      onStart(e.clientX, e.clientY);
      window.addEventListener('mousemove', mm);
      window.addEventListener('mouseup', mu);
    });
  },

  _snapBack: function (card) {
    card.style.transition = 'transform 0.4s cubic-bezier(0.175,0.885,0.32,1.275)';
    card.style.transform  = '';
    card.querySelectorAll('.swipe-overlay').forEach(o => o.classList.remove('visible'));
  },

  /* ─── Record decision ─── */
  decide: function (status) {
    if (this._idx >= this._items.length) return;
    const item = this._items[this._idx];
    this._decisions.push({ item, status });
    this._idx++;

    const top = document.querySelector('#sw-stage .swipe-card--top');
    if (top) {
      const D = APP_CONFIG.swipe.flyDistance;
      let tx = 0, ty = 0;
      if (status === 'Well Present') tx = D;
      else if (status === 'Broken')  tx = -D;
      else if (status === 'Missing') ty = -D;
      top.style.transition = 'transform 0.32s ease, opacity 0.32s ease';
      top.style.transform  = `translate(${tx}px,${ty}px) rotate(${tx*0.05}deg)`;
      top.style.opacity    = '0';
      setTimeout(() => top.remove(), 340);
    }

    this._updateProgress();

    if (this._idx >= this._items.length) {
      setTimeout(() => this._renderDeck(), 350);
    } else {
      setTimeout(() => this._renderDeck(), 100);
    }
  },

  /* ─── Undo ─── */
  undo: function () {
    if (this._decisions.length === 0) {
      const top = document.querySelector('#sw-stage .swipe-card--top');
      if (top) this._snapBack(top);
      return;
    }
    this._decisions.pop();
    this._idx = Math.max(0, this._idx - 1);
    document.querySelectorAll('#sw-stage .swipe-card').forEach(c => c.remove());
    document.getElementById('sw-empty').style.display = 'none';
    const btn = document.getElementById('sw-submit-btn');
    btn.disabled = true; btn.classList.remove('ready');
    this._updateProgress();
    this._renderDeck();
    ui.toast('Last decision undone', 'info');
  },

  _updateProgress: function () {
    document.getElementById('sw-progress-done').textContent  = this._idx;
    const pct = this._items.length ? (this._idx / this._items.length) * 100 : 0;
    const bar  = document.getElementById('sw-progress-bar');
    if (bar) bar.style.width = pct + '%';
  },

  /* ─── Submit ─── */
  submit: function () {
    if (this._onComplete) this._onComplete(this._decisions);
  }
};
