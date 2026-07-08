(function(){
  const CATEGORIES = [
    { id:'career',   label:'Career',        bg:'var(--c-career)',  ink:'var(--c-career-ink)' },
    { id:'health',   label:'Health',        bg:'var(--c-health)',  ink:'var(--c-health-ink)' },
    { id:'love',     label:'Relationships', bg:'var(--c-love)',    ink:'var(--c-love-ink)' },
    { id:'travel',   label:'Travel',        bg:'var(--c-travel)',  ink:'var(--c-travel-ink)' },
    { id:'learning', label:'Learning',      bg:'var(--c-learn)',   ink:'var(--c-learn-ink)' },
    { id:'money',    label:'Money',         bg:'var(--c-money)',   ink:'var(--c-money-ink)' },
  ];

  let state = {
    title: '2026 Vision Board',
    subtitle: 'A year in the making — pin what you\u2019re working toward.',
    cards: []
  };
  let activeFilter = 'all';
  let lastDeleted = null;
  let saveTimer = null;
  let uploadedImage = null;

  const boardEl = document.getElementById('board');
  const filtersEl = document.getElementById('filters');
  const titleEl = document.getElementById('boardTitle');
  const subtitleEl = document.getElementById('boardSubtitle');
  const statEl = document.getElementById('stat');

  function catInfo(id){ return CATEGORIES.find(c => c.id === id) || CATEGORIES[0]; }

  function hashRotate(id){
    let h = 0;
    for(let i=0;i<id.length;i++){ h = (h*31 + id.charCodeAt(i)) >>> 0; }
    return (((h % 700) / 100) - 3.5).toFixed(2);
  }

  function uid(){ return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

  async function loadBoard(){
    try{
      const raw = localStorage.getItem('board');
      if(raw){
        const parsed = JSON.parse(raw);
        state = Object.assign(state, parsed);
      }
    }catch(e){ /* no board yet */ }
    titleEl.textContent = state.title || '';
    subtitleEl.textContent = state.subtitle || '';
    renderFilters();
    renderBoard();
  }

  function scheduleSave(){
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try{ localStorage.setItem('board', JSON.stringify(state)); }
      catch(e){ console.error('Could not save board', e); }
    }, 450);
  }

  function renderFilters(){
    let html = `<button class="chip" data-filter="all" data-active="${activeFilter==='all'}">All</button>`;
    CATEGORIES.forEach(c => {
      html += `<button class="chip" data-filter="${c.id}" data-active="${activeFilter===c.id}">${c.label}</button>`;
    });
    filtersEl.innerHTML = html;
    filtersEl.querySelectorAll('.chip').forEach(btn => {
      btn.addEventListener('click', () => {
        activeFilter = btn.dataset.filter;
        renderFilters();
        renderBoard();
      });
    });
  }

  function renderBoard(){
    const visible = activeFilter === 'all' ? state.cards : state.cards.filter(c => c.category === activeFilter);

    statEl.textContent = state.cards.length + ' pinned';

    if(state.cards.length === 0){
      boardEl.innerHTML = `
        <div class="empty" style="column-span: all;">
          <h2>Nothing pinned yet</h2>
          <p>Add a photo or write a goal to start filling this board.</p>
        </div>`;
      return;
    }

    if(visible.length === 0){
      boardEl.innerHTML = `<div class="empty" style="column-span: all;"><p>No pins in this category yet.</p></div>`;
      return;
    }

    boardEl.innerHTML = visible.map(cardHtml).join('') + addTileHtml();
    boardEl.querySelectorAll('.card-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeCard(btn.dataset.id);
      });
    });
    const addTile = boardEl.querySelector('.card-add');
    if(addTile) addTile.addEventListener('click', openModal);
  }

  function cardHtml(c){
    const rotate = hashRotate(c.id);
    if(c.type === 'photo'){
      return `
      <div class="card card-photo" style="--rotate:${rotate}deg;">
        <div class="tape"></div>
        <button class="card-remove" data-id="${c.id}" aria-label="Remove pin">×</button>
        <img src="${c.image}" alt="${escapeHtml(c.caption || 'Pinned photo')}">
        ${c.caption ? `<div class="card-caption">${escapeHtml(c.caption)}</div>` : ''}
      </div>`;
    }
    const cat = catInfo(c.category);
    return `
    <div class="card card-goal" style="--rotate:${rotate}deg; --goal-bg:${cat.bg}; --goal-ink:${cat.ink};">
      <div class="tape"></div>
      <button class="card-remove" data-id="${c.id}" aria-label="Remove pin">×</button>
      <span class="card-eyebrow">${cat.label}</span>
      <h3>${escapeHtml(c.title)}</h3>
      ${c.note ? `<p>${escapeHtml(c.note)}</p>` : ''}
    </div>`;
  }

  function addTileHtml(){
    return `<button class="card-add" type="button"><span class="plus">＋</span>Pin something new</button>`;
  }

  function escapeHtml(str){
    return (str || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function removeCard(id){
    const idx = state.cards.findIndex(c => c.id === id);
    if(idx === -1) return;
    lastDeleted = { card: state.cards[idx], index: idx };
    state.cards.splice(idx, 1);
    renderBoard();
    scheduleSave();
    showToast();
  }

  function showToast(){
    const old = document.querySelector('.toast');
    if(old) old.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `Pin removed <button id="undoBtn">Undo</button>`;
    document.body.appendChild(t);
    const timer = setTimeout(() => t.remove(), 4500);
    t.querySelector('#undoBtn').addEventListener('click', () => {
      clearTimeout(timer);
      if(lastDeleted){
        state.cards.splice(lastDeleted.index, 0, lastDeleted.card);
        lastDeleted = null;
        renderBoard();
        scheduleSave();
      }
      t.remove();
    });
  }

  /* ---------- Header title / subtitle ---------- */
  titleEl.addEventListener('blur', () => { state.title = titleEl.textContent.trim(); scheduleSave(); });
  subtitleEl.addEventListener('blur', () => { state.subtitle = subtitleEl.textContent.trim(); scheduleSave(); });
  titleEl.addEventListener('keydown', e => { if(e.key==='Enter'){ e.preventDefault(); titleEl.blur(); } });
  subtitleEl.addEventListener('keydown', e => { if(e.key==='Enter'){ e.preventDefault(); subtitleEl.blur(); } });

  document.getElementById('clearBtn').addEventListener('click', async () => {
    if(state.cards.length === 0) return;
    if(confirm('Clear every pin from this board? This can\u2019t be undone.')){
      state.cards = [];
      renderBoard();
      scheduleSave();
    }
  });

  /* ---------- Modal ---------- */
  const backdrop = document.getElementById('backdrop');
  const tabs = document.querySelectorAll('.tab');
  const panelPhoto = document.getElementById('panelPhoto');
  const panelGoal = document.getElementById('panelGoal');
  const fileInput = document.getElementById('fileInput');
  const previewWrap = document.getElementById('previewWrap');
  const previewImg = document.getElementById('previewImg');
  const goalCategory = document.getElementById('goalCategory');
  let activeTab = 'photo';

  goalCategory.innerHTML = CATEGORIES.map(c => `<option value="${c.id}">${c.label}</option>`).join('');

  function openModal(){
    backdrop.style.display = 'flex';
    resetModalFields();
    setTab('photo');
    setTimeout(() => document.getElementById('uploadLabel').focus(), 0);
  }
  function closeModal(){
    backdrop.style.display = 'none';
  }
  function resetModalFields(){
    uploadedImage = null;
    fileInput.value = '';
    previewWrap.style.display = 'none';
    document.getElementById('photoCaption').value = '';
    document.getElementById('goalTitle').value = '';
    document.getElementById('goalNote').value = '';
    goalCategory.value = CATEGORIES[0].id;
  }
  function setTab(tab){
    activeTab = tab;
    tabs.forEach(t => t.dataset.active = (t.dataset.tab === tab));
    panelPhoto.style.display = tab === 'photo' ? 'block' : 'none';
    panelGoal.style.display = tab === 'goal' ? 'block' : 'none';
  }
  tabs.forEach(t => t.addEventListener('click', () => setTab(t.dataset.tab)));

  document.getElementById('addBtnHeader').addEventListener('click', openModal);
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => { if(e.target === backdrop) closeModal(); });
  document.addEventListener('keydown', (e) => { if(e.key === 'Escape' && backdrop.style.display === 'flex') closeModal(); });

  function resizeImage(file, maxWidth, quality){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let w = img.width, h = img.height;
          if(w > maxWidth){ h = Math.round(h * maxWidth / w); w = maxWidth; }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if(!file) return;
    try{
      uploadedImage = await resizeImage(file, 900, 0.75);
      previewImg.src = uploadedImage;
      previewWrap.style.display = 'block';
    }catch(e){
      alert('Could not read that image — try a different file.');
    }
  });

  document.getElementById('saveBtn').addEventListener('click', () => {
    if(activeTab === 'photo'){
      if(!uploadedImage){ alert('Choose a photo first.'); return; }
      state.cards.unshift({
        id: uid(),
        type: 'photo',
        image: uploadedImage,
        caption: document.getElementById('photoCaption').value.trim()
      });
    } else {
      const title = document.getElementById('goalTitle').value.trim();
      if(!title){ alert('Give the goal a short title.'); return; }
      state.cards.unshift({
        id: uid(),
        type: 'goal',
        title,
        note: document.getElementById('goalNote').value.trim(),
        category: goalCategory.value
      });
    }
    closeModal();
    renderBoard();
    scheduleSave();
  });

  loadBoard();
})();