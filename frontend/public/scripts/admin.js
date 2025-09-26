(function(){
  const API_BASE = 'http://localhost:5080';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const form = $('#productForm');
  const statusEl = $('#formStatus');
  const listEl = $('#adminProducts');
  const filterSel = $('#filterCategory');
  const fileInput = $('#images');
  const imagePreview = $('#imagePreview');
  const existingImages = $('#existingImages');
  const existingImagesList = $('#existingImagesList');
  const newImagesLabel = $('#newImagesLabel');
  const logoutBtn = $('#logoutBtn');
  const showAddFormBtn = $('#showAddFormBtn');
  const cancelFormBtn = $('#cancelFormBtn');
  const tokenKey = 'sc_admin_token';
  let editingProductId = null;
  let existingImageIds = []; // Track existing images for deletion
  let imagesToDelete = []; // Track images marked for deletion

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

  function formatPrice(priceBGN) {
    if (typeof priceBGN !== 'number' || priceBGN <= 0) return '';
    const priceEUR = priceBGN / 1.95583;
    return `${priceBGN.toFixed(2)} лв. / ${priceEUR.toFixed(2)} €`;
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

  function showImagePreviews(files) {
    if (!imagePreview) return;
    imagePreview.innerHTML = '';
    
    const hasFiles = files && files.length > 0;
    if (newImagesLabel) {
      newImagesLabel.style.display = hasFiles ? 'block' : 'none';
    }
    
    if (!hasFiles) return;
    
    Array.from(files).forEach((file, index) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const preview = document.createElement('div');
          preview.style.cssText = 'position:relative; width:80px; height:80px; border:1px solid #ddd; border-radius:4px; overflow:hidden;';
          preview.innerHTML = `
            <img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover;">
            <button type="button" onclick="removeNewImagePreview(${index})" style="position:absolute; top:2px; right:2px; width:20px; height:20px; border:none; background:#e74c3c; color:white; border-radius:50%; cursor:pointer; font-size:12px; line-height:1;">×</button>
            <div style="position:absolute; bottom:2px; left:2px; background:rgba(0,0,0,0.7); color:white; padding:1px 4px; border-radius:2px; font-size:10px;">НОВА</div>
          `;
          imagePreview.appendChild(preview);
        };
        reader.readAsDataURL(file);
      }
    });
  }

  function showExistingImages(images) {
    if (!existingImagesList || !images || images.length === 0) {
      if (existingImages) existingImages.style.display = 'none';
      return;
    }
    
    if (existingImages) existingImages.style.display = 'block';
    existingImagesList.innerHTML = '';
    existingImageIds = images.map(img => img.id);
    imagesToDelete = [];
    
    images.forEach((img, index) => {
      const preview = document.createElement('div');
      preview.style.cssText = 'position:relative; width:80px; height:80px; border:1px solid #ddd; border-radius:4px; overflow:hidden;';
      preview.innerHTML = `
        <img src="${API_BASE}${img.url}" style="width:100%; height:100%; object-fit:cover;">
        <button type="button" onclick="markImageForDeletion('${img.id}', ${index})" style="position:absolute; top:2px; right:2px; width:20px; height:20px; border:none; background:#e74c3c; color:white; border-radius:50%; cursor:pointer; font-size:12px; line-height:1;">×</button>
        <div style="position:absolute; bottom:2px; left:2px; background:rgba(0,0,0,0.7); color:white; padding:1px 4px; border-radius:2px; font-size:10px;">СЪЩЕСТВУВА</div>
      `;
      preview.setAttribute('data-image-id', img.id);
      existingImagesList.appendChild(preview);
    });
  }

  window.removeNewImagePreview = function(index) {
    if (!fileInput || !fileInput.files) return;
    const dt = new DataTransfer();
    Array.from(fileInput.files).forEach((file, i) => {
      if (i !== index) dt.items.add(file);
    });
    fileInput.files = dt.files;
    showImagePreviews(fileInput.files);
  };

  window.markImageForDeletion = function(imageId, index) {
    const preview = document.querySelector(`[data-image-id="${imageId}"]`);
    if (!preview) return;
    
    if (imagesToDelete.includes(imageId)) {
      // Unmark for deletion
      imagesToDelete = imagesToDelete.filter(id => id !== imageId);
      preview.style.opacity = '1';
      preview.style.filter = 'none';
      const overlay = preview.querySelector('.delete-overlay');
      if (overlay) overlay.remove();
    } else {
      // Mark for deletion
      imagesToDelete.push(imageId);
      preview.style.opacity = '0.5';
      preview.style.filter = 'grayscale(100%)';
      const overlay = document.createElement('div');
      overlay.className = 'delete-overlay';
      overlay.style.cssText = 'position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(231,76,60,0.8); display:flex; align-items:center; justify-content:center; color:white; font-weight:bold; font-size:12px;';
      overlay.textContent = 'ЩЕ СЕ ИЗТРИЕ';
      preview.appendChild(overlay);
    }
  };

  // Image carousel functionality
  const imageStates = new Map(); // Track current image index for each product

  window.changeImage = function(productId, direction) {
    const card = document.querySelector(`[data-id="${productId}"]`);
    if (!card) return;
    
    const mediaDiv = card.querySelector('.product-media');
    const images = mediaDiv.querySelectorAll('img');
    const counter = mediaDiv.querySelector('.image-counter');
    
    if (images.length <= 1) return;
    
    let currentIndex = imageStates.get(productId) || 0;
    currentIndex += direction;
    
    if (currentIndex < 0) currentIndex = images.length - 1;
    if (currentIndex >= images.length) currentIndex = 0;
    
    showImageAtIndex(productId, currentIndex);
  };

  window.showImage = function(productId, index) {
    showImageAtIndex(productId, index);
  };

  function showImageAtIndex(productId, index) {
    const card = document.querySelector(`[data-id="${productId}"]`);
    if (!card) return;
    
    const mediaDiv = card.querySelector('.product-media');
    const images = mediaDiv.querySelectorAll('img');
    const counter = mediaDiv.querySelector('.image-counter');
    const thumbnails = card.querySelectorAll('.thumbnails img');
    
    if (images.length <= 1) return;
    
    // Hide all images
    images.forEach(img => img.style.display = 'none');
    // Show current image
    if (images[index]) {
      images[index].style.display = 'block';
    }
    
    // Update counter
    if (counter) {
      counter.textContent = `${index + 1}/${images.length}`;
    }
    
    // Update thumbnail borders
    thumbnails.forEach((thumb, i) => {
      thumb.style.borderColor = i === index ? '#2c3e50' : '#ddd';
    });
    
    // Save state
    imageStates.set(productId, index);
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
      const images = Array.isArray(p.images) ? p.images : [];
      let mediaHtml = '';
      
      if (images.length === 0) {
        mediaHtml = `<div class="product-media no-image" style="height:200px; background:#f8f9fa; display:flex; align-items:center; justify-content:center;"></div>`;
      } else if (images.length === 1) {
        const fullImageUrl = `${API_BASE}${images[0].url}`;
        mediaHtml = `<div class="product-media" style="position:relative; height:200px; background:#f8f9fa; display:flex; align-items:center; justify-content:center;"><img src="${fullImageUrl}" alt="${escapeHtml(p.name)}" style="width:auto; height:100%; max-width:100%; object-fit:contain; margin:0 auto;"></div>`;
      } else {
        // Multiple images - create carousel with thumbnails
        const imageElements = images.map((img, index) => 
          `<img src="${API_BASE}${img.url}" alt="${escapeHtml(p.name)}" style="width:auto; height:100%; max-width:100%; object-fit:contain; display:${index === 0 ? 'block' : 'none'}; margin:0 auto;">`
        ).join('');
        
        const thumbnails = images.map((img, index) => 
          `<img src="${API_BASE}${img.url}" alt="Снимка ${index + 1}" onclick="showImage('${p.id || p.Id}', ${index})" style="width:40px; height:40px; object-fit:cover; border:2px solid ${index === 0 ? '#2c3e50' : '#ddd'}; border-radius:4px; cursor:pointer; transition:border-color 0.3s;">`
        ).join('');
        
        mediaHtml = `
          <div class="product-media-wrapper">
            <div class="product-media" style="position:relative; height:200px; background:#f8f9fa; display:flex; align-items:center; justify-content:center;">
              ${imageElements}
              <div class="image-counter" style="position:absolute; top:5px; right:5px; background:rgba(0,0,0,0.7); color:white; padding:2px 6px; border-radius:10px; font-size:11px;">1/${images.length}</div>
              <button class="prev-btn" onclick="changeImage('${p.id || p.Id}', -1)" style="position:absolute; left:5px; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.5); color:white; border:none; border-radius:50%; width:30px; height:30px; cursor:pointer; font-size:16px;">‹</button>
              <button class="next-btn" onclick="changeImage('${p.id || p.Id}', 1)" style="position:absolute; right:5px; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.5); color:white; border:none; border-radius:50%; width:30px; height:30px; cursor:pointer; font-size:16px;">›</button>
            </div>
            <div class="thumbnails" style="display:flex; gap:4px; margin-top:8px; padding:0 4px; overflow-x:auto;">
              ${thumbnails}
            </div>
          </div>`;
      }
      
      return `
      <article class="product-card" data-id="${p.id || p.Id}">
        ${mediaHtml}
        <div class="product-body">
          <h3 class="product-title">${escapeHtml(p.name)}</h3>
          ${p.description ? `<p class="product-desc">${escapeHtml(p.description)}</p>` : '<p class="product-desc">Няма описание</p>'}
          <div class="product-meta">
            <div class="product-info">
              ${typeof p.price === 'number' ? `<span class="product-price">${formatPrice(p.price)}</span>` : ''}
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
      const productId = editingProductId || created.id || created.Id;

      // Delete marked images during edit
      if (editingProductId && imagesToDelete.length > 0) {
        console.log('Изтриване на', imagesToDelete.length, 'снимки');
        for (const imageId of imagesToDelete) {
          try {
            const delRes = await fetch(`${API_BASE}/api/Uploads/${imageId}`, {
              method: 'DELETE',
              headers: { 'Authorization': 'Bearer ' + t }
            });
            if (delRes.ok) {
              console.log(`Снимка ${imageId} изтрита успешно`);
            } else {
              console.error(`Грешка при изтриване на снимка ${imageId}`);
            }
          } catch (err) {
            console.error(`Грешка при изтриване на снимка ${imageId}:`, err);
          }
        }
      }

      // Optional multiple images upload
      if (fileInput && fileInput.files && fileInput.files.length > 0 && productId){
        console.log('Качване на', fileInput.files.length, 'снимки за продукт ID:', productId);
        let uploadedCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < fileInput.files.length; i++) {
          const file = fileInput.files[i];
          const upFd = new FormData();
          upFd.append('ProductId', productId);
          upFd.append('File', file);
          
          try {
            const upRes = await fetch(API_BASE + '/api/Uploads', {
              method: 'POST',
              headers: { 'Authorization': 'Bearer ' + t },
              body: upFd
            });
            
            if (upRes.ok) {
              uploadedCount++;
              console.log(`Снимка ${i + 1} качена успешно`);
            } else {
              errorCount++;
              const utxt = await upRes.text();
              console.error(`Грешка при качване на снимка ${i + 1}:`, utxt);
            }
          } catch (err) {
            errorCount++;
            console.error(`Грешка при качване на снимка ${i + 1}:`, err);
          }
        }
        
        if (errorCount > 0) {
          statusEl.style.color = '#e67e22';
          statusEl.textContent += ` (${uploadedCount} снимки качени, ${errorCount} грешки)`;
        } else if (uploadedCount > 0) {
          console.log(`Всички ${uploadedCount} снимки са качени успешно`);
        }
      }

      form.reset();
      if (imagePreview) imagePreview.innerHTML = '';
      if (existingImages) existingImages.style.display = 'none';
      if (newImagesLabel) newImagesLabel.style.display = 'none';
      existingImageIds = [];
      imagesToDelete = [];
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

  async function onEditClick(e){
    e.preventDefault();
    const id = e.currentTarget.getAttribute('data-id');
    const card = e.currentTarget.closest('.product-card');
    if (!id || !card) return;
    
    try {
      // Fetch full product data including images
      const res = await fetch(`${API_BASE}/api/Products/${id}`);
      if (!res.ok) throw new Error('Failed to fetch product');
      const product = await res.json();
      
      const titleEl = card.querySelector('.product-title');
      const descEl = card.querySelector('.product-desc');
      const priceEl = card.querySelector('.product-price');
      const tagEl = card.querySelector('.product-tag');
      
      // populate form
      $('#name').value = product.name || (titleEl ? titleEl.textContent : '');
      $('#description').value = product.description || (descEl ? descEl.textContent : '');
      if (priceEl){
        const m = priceEl.textContent.match(/([0-9]+(?:\.[0-9]+)?)/);
        $('#price').value = m ? m[1] : '';
      }
      if (tagEl){
        const label = tagEl.textContent.trim();
        const map = { 'Мрамор': 1, 'Гранит': 2, 'Триплекс': 3 };
        $('#category').value = map[label] || 1;
      }
      
      // Show existing images
      showExistingImages(product.images || []);
      
      // Clear new images
      if (fileInput) fileInput.value = '';
      showImagePreviews([]);
      
      editingProductId = id;
      statusEl.style.color = '#333';
      statusEl.textContent = 'Редакция на продукт (след запазване ще се обнови)';
      // Show the form
      form.style.display = 'grid';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Error loading product for edit:', err);
      alert('Грешка при зареждане на продукта за редакция');
    }
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
      existingImageIds = [];
      imagesToDelete = [];
      form.reset();
      $('#formStatus').textContent = '';
      if (imagePreview) imagePreview.innerHTML = '';
      if (existingImages) existingImages.style.display = 'none';
      if (newImagesLabel) newImagesLabel.style.display = 'none';
      form.style.display = 'grid';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    cancelFormBtn?.addEventListener('click', () => {
      editingProductId = null;
      existingImageIds = [];
      imagesToDelete = [];
      form.reset();
      $('#formStatus').textContent = '';
      if (imagePreview) imagePreview.innerHTML = '';
      if (existingImages) existingImages.style.display = 'none';
      if (newImagesLabel) newImagesLabel.style.display = 'none';
      form.style.display = 'none';
    });
    
    // Image preview functionality
    fileInput?.addEventListener('change', (e) => {
      showImagePreviews(e.target.files);
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
