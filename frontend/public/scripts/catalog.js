(function(){
  const API_BASE = 'http://localhost:5080';
  
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  
  const productsContainer = $('#dynamic-products');
  const categoryFilter = $('#category-filter');
  const productsTitle = $('#products-title');
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
  
  function updateTitle(category) {
    if (!productsTitle) return;
    
    if (category) {
      const categoryName = categoryLabel(category);
      productsTitle.textContent = `Паметници от ${categoryName}`;
    } else {
      productsTitle.textContent = 'Наши продукти';
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
        <article class="product-card">
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
            ${product.description ? `<p class="product-description">${escapeHtml(product.description)}</p>` : ''}
            <div class="product-meta">
              <span class="product-price">${product.price ? `${product.price.toFixed(2)} лв.` : 'Цена при запитване'}</span>
              <span class="product-category">${categoryLabel(product.category)}</span>
            </div>
          </div>
        </article>
      `;
    }).join('');
    
    productsContainer.innerHTML = html;
  }
  
  async function loadProducts(category = '') {
    if (!productsContainer) return;
    
    try {
      if (loadingMessage) loadingMessage.style.display = 'block';
      if (noProductsMessage) noProductsMessage.style.display = 'none';
      productsContainer.innerHTML = '';
      
      const products = await fetchProducts(category);
      renderProducts(products);
      updateTitle(category);
      
    } catch (error) {
      console.error('Грешка при зареждане на продукти:', error);
      productsContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
          <p style="color: #e74c3c;">Грешка при зареждане на продукти. Моля опитайте отново.</p>
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
    
    // Handle monument card clicks (for smooth navigation)
    const monumentCards = $$('.monument-card[data-category]');
    monumentCards.forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        const category = card.getAttribute('data-category');
        if (categoryFilter) categoryFilter.value = category;
        updateUrl(category);
        loadProducts(category);
        
        // Scroll to products section
        const productsSection = $('.products-section');
        if (productsSection) {
          productsSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
    
    // Handle sidebar catalog menu clicks
    const catalogLinks = $$('.catalog-menu a[data-category]');
    catalogLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const category = link.getAttribute('data-category');
        if (categoryFilter) categoryFilter.value = category;
        updateUrl(category);
        loadProducts(category);
        
        // Scroll to products section
        const productsSection = $('.products-section');
        if (productsSection) {
          productsSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
