(function(){
  const hostname = window.location.hostname;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  const API_BASE = isLocal ? 'http://localhost:5080' : window.location.origin;
  
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  
  const productsContainer = $('#dynamic-products');
  const categoryFilter = $('#category-filter');
  const productsTitle = $('#products-title');
  const breadcrumbCategory = $('#breadcrumb-category');
  const loadingMessage = $('#loading-message');
  const noProductsMessage = $('#no-products-message');
  
  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  function categoryLabel(v) {
    switch(Number(v)) {
      case 1: return 'Мрамор';
      case 2: return 'Гранит';
      case 3: return 'Триплекс';
      default: return '';
    }
  }

  function formatPrice(priceBGN) {
    if (typeof priceBGN !== 'number' || priceBGN <= 0) return 'Цена при запитване';
    const priceEUR = priceBGN / 1.95583;
    return `${priceBGN.toFixed(2)} лв. / ${priceEUR.toFixed(2)} €`;
  }
  
  function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      category: params.get('category') || ''
    };
  }
  
  function updateUrl(category) {
    const url = new URL(window.location);
    if (category) {
      url.searchParams.set('category', category);
    } else {
      url.searchParams.delete('category');
    }
    window.history.pushState({}, '', url);
  }
  
  function updateTitles(category) {
    if (category) {
      const categoryName = categoryLabel(category);
      if (productsTitle) productsTitle.textContent = `Паметници от ${categoryName}`;
      if (breadcrumbCategory) breadcrumbCategory.textContent = `Паметници от ${categoryName}`;
      document.title = `Паметници от ${categoryName} - Stone Craft`;
    } else {
      if (productsTitle) productsTitle.textContent = 'Всички продукти';
      if (breadcrumbCategory) breadcrumbCategory.textContent = 'Всички продукти';
      document.title = 'Продукти - Stone Craft';
    }
  }
  
  async function fetchProducts(category) {
    const url = new URL(API_BASE + '/api/Products');
    if (category) {
      url.searchParams.set('category', String(category));
    }
    
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  }
  
  function renderProducts(products) {
    if (!productsContainer) return;
    
    if (!Array.isArray(products) || products.length === 0) {
      productsContainer.innerHTML = '';
      if (noProductsMessage) noProductsMessage.style.display = 'block';
      return;
    }
    
    if (noProductsMessage) noProductsMessage.style.display = 'none';
    
    const html = products.map(product => {
      const images = Array.isArray(product.images) ? product.images : [];
      const firstImage = images.length > 0 ? images[0].url : '';
      const imageUrl = firstImage ? `${API_BASE}${firstImage}` : '';
      
      return `
        <article class="product-card" onclick="openProductDetails('${product.id || product.Id}')" style="cursor: pointer;">
          <div class="product-image">
            ${imageUrl ? 
              `<img src="${imageUrl}" alt="${escapeHtml(product.name)}" loading="lazy">` :
              `<div class="no-image-placeholder">
                <i class="fas fa-image"></i>
                <span>Няма снимка</span>
              </div>`
            }
            ${images.length > 1 ? `<span class="image-count">${images.length} снимки</span>` : ''}
          </div>
          <div class="product-info">
            <h3 class="product-title">${escapeHtml(product.name)}</h3>
            <div class="product-description-container">
              ${product.description ? `<p class="product-description">${escapeHtml(product.description)}</p>` : '<p class="product-description">Няма описание</p>'}
            </div>
            <div class="product-meta">
              <span class="product-price">${formatPrice(product.price)}</span>
              <span class="product-category">${categoryLabel(product.category)}</span>
            </div>
          </div>
        </article>
      `;
    }).join('');
    
    productsContainer.innerHTML = html;
  }
  
  window.openProductDetails = function(productId) {
    window.location.href = `product-details.html?id=${productId}`;
  };

  async function loadProducts(category = '') {
    if (!productsContainer) return;
    
    try {
      if (loadingMessage) loadingMessage.style.display = 'block';
      if (noProductsMessage) noProductsMessage.style.display = 'none';
      productsContainer.innerHTML = '';
      
      const products = await fetchProducts(category);
      renderProducts(products);
      updateTitles(category);
      
    } catch (error) {
      console.error('Грешка при зареждане на продукти:', error);
      productsContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
          <div style="display:inline-block; padding:2rem; background:white; border-radius:8px; box-shadow:0 2px 10px rgba(0,0,0,0.1);">
            <i class="fas fa-exclamation-triangle" style="font-size:3rem; color:#e74c3c; margin-bottom:1rem;"></i>
            <h3 style="margin:0 0 0.5rem 0; color:#2c3e50;">Грешка при зареждане</h3>
            <p style="margin:0 0 1rem 0; color:#666;">Не можахме да заредим продуктите. Моля опитайте отново.</p>
            <button class="btn btn-primary" onclick="location.reload()">Опитай отново</button>
          </div>
        </div>
      `;
    } finally {
      if (loadingMessage) loadingMessage.style.display = 'none';
    }
  }
  
  function init() {
    // Get category from URL
    const params = getUrlParams();
    const initialCategory = params.category;
    
    // Set filter dropdown to match URL
    if (categoryFilter && initialCategory) {
      categoryFilter.value = initialCategory;
    }
    
    // Load products for initial category
    loadProducts(initialCategory);
    
    // Handle filter change
    if (categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
        const category = e.target.value;
        updateUrl(category);
        loadProducts(category);
      });
    }
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
