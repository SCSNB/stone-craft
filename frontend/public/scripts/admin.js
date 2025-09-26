(function(){
  const API_BASE = 'http://localhost:5080';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const form = $('#productForm');
  const statusEl = $('#formStatus');
  const listEl = $('#adminProducts');
  const filterSel = $('#filterCategory');
  const fileInput = $('#image');
  const logoutBtn = $('#logoutBtn');
  const showAddFormBtn = $('#showAddFormBtn');
  const cancelFormBtn = $('#cancelFormBtn');
  const tokenKey = 'sc_admin_token';
  let editingProductId = null;

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

  function updateProductsCount(count){
    const productsHeader = $('#productsHeader');
    if (productsHeader) {
      const filterSel = $('#filterCategory');
      const selectedCategory = filterSel ? filterSel.value : '';
      let headerText = 'Продукти';
      
      if (selectedCategory) {
        const categoryName = categoryLabel(selectedCategory);
        headerText = `Продукти - ${categoryName}`;
      }
      
      productsHeader.textContent = `${headerText} (${count})`;
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
    // Update products count in header
    updateProductsCount(items.length);
    
    if (!Array.isArray(items) || items.length === 0){
      listEl.innerHTML = '<p>Няма продукти.</p>';
      return;
    }
    const html = items.map(p => {
      const img = (Array.isArray(p.images) && p.images.length > 0) ? (p.images[0].url || '') : '';
      const mediaHtml = img 
        ? `<div class="product-media"><img src="${img}" alt="${escapeHtml(p.name)}"></div>`
        : `<div class="product-media no-image"></div>`;
      
      return `
      <article class="product-card" data-id="${p.id || p.Id}">
        ${mediaHtml}
        <div class="product-body">
          <h3 class="product-title">${escapeHtml(p.name)}</h3>
          ${p.description ? `<p class="product-desc">${escapeHtml(p.description)}</p>` : '<p class="product-desc">Няма описание</p>'}
          <div class="product-meta">
            <div class="product-info">
              ${typeof p.price === 'number' ? `<span class="product-price">${p.price.toFixed(2)} лв.</span>` : ''}
              ${p.category ? `<span class="product-tag">${categoryLabel(p.category)}</span>` : ''}
            </div>
            <div class="product-actions">
              <button class="btn btn-secondary js-edit" data-id="${p.id || p.Id}">Редакция</button>
              <button class="btn btn-secondary js-delete" data-id="${p.id || p.Id}">Изтриване</button>
            </div>
          </div>
        </div>
      </article>`;
    }).join('');
    listEl.innerHTML = html;
    // bind actions
    listEl.querySelectorAll('.js-edit').forEach(btn => btn.addEventListener('click', onEditClick));
    listEl.querySelectorAll('.js-delete').forEach(btn => btn.addEventListener('click', onDeleteClick));
  }

  async function reloadList(){
    const cat = filterSel ? filterSel.value : '';
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
      let res;
      if (editingProductId){
        // update
        res = await fetch(API_BASE + '/api/Products/' + encodeURIComponent(editingProductId), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t },
          body: JSON.stringify(payload)
        });
      } else {
        // create
        res = await fetch(API_BASE + '/api/Products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t },
          body: JSON.stringify(payload)
        });
      }
      if (!res.ok){
        const txt = await res.text();
        throw new Error('HTTP ' + res.status + ': ' + txt);
      }
      const created = editingProductId ? { id: editingProductId } : await res.json();

      // Optional image upload
      if (fileInput && fileInput.files && fileInput.files[0]){
        const upFd = new FormData();
        upFd.append('ProductId', created.id || created.Id || '');
        upFd.append('File', fileInput.files[0]);
        const upRes = await fetch(API_BASE + '/api/Uploads', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + t },
          body: upFd
        });
        if (!upRes.ok){
          const utxt = await upRes.text();
          console.warn('Грешка при качване на снимка:', utxt);
        }
      }

      form.reset();
      form.style.display = 'none';
      statusEl.style.color = '#27ae60';
      statusEl.textContent = editingProductId ? 'Успешно обновен продукт' : 'Успешно добавен продукт';
      editingProductId = null;
      await reloadList();
    }catch(err){
      console.error(err);
      statusEl.style.color = '#e74c3c';
      statusEl.textContent = editingProductId ? 'Грешка при обновяване на продукт' : 'Грешка при добавяне на продукт';
    }
  }

  function onEditClick(e){
    e.preventDefault();
    const id = e.currentTarget.getAttribute('data-id');
    const card = e.currentTarget.closest('.product-card');
    if (!id || !card) return;
    const titleEl = card.querySelector('.product-title');
    const descEl = card.querySelector('.product-desc');
    const priceEl = card.querySelector('.product-price');
    const tagEl = card.querySelector('.product-tag');
    // populate form
    $('#name').value = titleEl ? titleEl.textContent : '';
    $('#description').value = descEl ? descEl.textContent : '';
    if (priceEl){
      const m = priceEl.textContent.match(/([0-9]+(?:\.[0-9]+)?)/);
      $('#price').value = m ? m[1] : '';
    }
    if (tagEl){
      const label = tagEl.textContent.trim();
      const map = { 'Мрамор': 1, 'Гранит': 2, 'Триплекс': 3 };
      $('#category').value = map[label] || 1;
    }
    editingProductId = id;
    statusEl.style.color = '#333';
    statusEl.textContent = 'Редакция на продукт (след запазване ще се обнови)';
    // Show the form
    form.style.display = 'grid';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function onDeleteClick(e){
    e.preventDefault();
    const id = e.currentTarget.getAttribute('data-id');
    if (!id) return;
    if (!confirm('Сигурни ли сте, че искате да изтриете този продукт?')) return;
    const t = getToken();
    try{
      const res = await fetch(API_BASE + '/api/Products/' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + t }
      });
      if (!res.ok){
        const txt = await res.text();
        throw new Error('HTTP ' + res.status + ': ' + txt);
      }
      await reloadList();
    } catch(err){
      console.error(err);
      alert('Грешка при изтриване на продукта');
    }
  }

  function init(){
    if (!form || !listEl) return; // not on admin page
    if (!requireAuth()) return;
    form.addEventListener('submit', onSubmit);
    filterSel?.addEventListener('change', reloadList);
    showAddFormBtn?.addEventListener('click', () => {
      editingProductId = null;
      form.reset();
      $('#formStatus').textContent = '';
      form.style.display = 'grid';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    cancelFormBtn?.addEventListener('click', () => {
      editingProductId = null;
      form.reset();
      $('#formStatus').textContent = '';
      form.style.display = 'none';
    });
    logoutBtn?.addEventListener('click', () => {
      localStorage.removeItem(tokenKey);
      window.location.href = 'login.html';
    });
    reloadList().catch(err => {
      console.error(err);
      if (listEl){
        listEl.innerHTML = '<p style="color:#e74c3c">Грешка при зареждане на продукти. Проверете връзката към API (http://localhost:5080) и опитайте отново.</p>';
      }
    });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
