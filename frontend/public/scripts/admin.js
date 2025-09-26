(function(){
  const API_BASE = 'http://localhost:5080';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const form = $('#productForm');
  const statusEl = $('#formStatus');
  const listEl = $('#adminProducts');
  const filterSel = $('#filterCategory');
  const logoutBtn = $('#logoutBtn');
  const tokenKey = 'sc_admin_token';

  function getToken(){
    return localStorage.getItem(tokenKey) || '';
  }
  function requireAuth(){
    const t = getToken();
    if (!t){
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }

  function escapeHtml(str){
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function categoryLabel(v){
    switch(Number(v)){
      case 1: return 'Мрамор';
      case 2: return 'Гранит';
      case 3: return 'Триплекс';
      default: return '';
    }
  }

  async function fetchProducts(category){
    const url = new URL(API_BASE + '/api/Products');
    if (category) url.searchParams.set('category', String(category));
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  }

  function renderProducts(items){
    if (!Array.isArray(items) || items.length === 0){
      listEl.innerHTML = '<p>Няма продукти.</p>';
      return;
    }
    const html = items.map(p => `
      <article class="product-card">
        <div class="product-media"></div>
        <div class="product-body">
          <h3 class="product-title">${escapeHtml(p.name)}</h3>
          ${p.description ? `<p class="product-desc">${escapeHtml(p.description)}</p>` : ''}
          <div class="product-meta" style="display:flex; gap:.75rem; flex-wrap:wrap;">
            ${typeof p.price === 'number' ? `<span class="product-price">${p.price.toFixed(2)} лв.</span>` : ''}
            ${p.category ? `<span class="product-tag">${categoryLabel(p.category)}</span>` : ''}
          </div>
        </div>
      </article>
    `).join('');
    listEl.innerHTML = html;
  }

  async function reloadList(){
    const cat = filterSel.value;
    const data = await fetchProducts(cat);
    renderProducts(data);
  }

  async function onSubmit(e){
    e.preventDefault();
    statusEl.textContent = '';
    const fd = new FormData(form);
    const payload = {
      name: fd.get('name')?.toString() || '',
      description: fd.get('description')?.toString() || '',
      price: Number(fd.get('price')) || 0,
      category: Number(fd.get('category')) || 1
    };

    try{
      const t = getToken();
      if (!t){
        window.location.href = 'login.html';
        return;
      }
      const res = await fetch(API_BASE + '/api/Products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t },
        body: JSON.stringify(payload)
      });
      if (!res.ok){
        const txt = await res.text();
        throw new Error('HTTP ' + res.status + ': ' + txt);
      }
      form.reset();
      statusEl.style.color = '#27ae60';
      statusEl.textContent = 'Успешно добавен продукт';
      await reloadList();
    }catch(err){
      console.error(err);
      statusEl.style.color = '#e74c3c';
      statusEl.textContent = 'Грешка при добавяне на продукт';
    }
  }

  function init(){
    if (!form || !listEl) return; // not on admin page
    if (!requireAuth()) return;
    form.addEventListener('submit', onSubmit);
    filterSel?.addEventListener('change', reloadList);
    logoutBtn?.addEventListener('click', () => {
      localStorage.removeItem(tokenKey);
      window.location.href = 'login.html';
    });
    reloadList().catch(console.error);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
