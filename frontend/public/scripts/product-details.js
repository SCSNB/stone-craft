(function(){
  const API_BASE = 'http://localhost:5080';
  
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  
  const loadingState = $('#loading-state');
  const errorState = $('#error-state');
  const productDetails = $('#product-details');
  const mainImage = $('#main-image');
  const noImagePlaceholder = $('#no-image-placeholder');
  const thumbnailGallery = $('#thumbnail-gallery');
  const productTitle = $('#product-title');
  const productCategory = $('#product-category');
  const productPrice = $('#product-price');
  const productDescription = $('#product-description');
  const breadcrumbCategory = $('#breadcrumb-category');
  const breadcrumbProduct = $('#breadcrumb-product');
  
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
    if (typeof priceBGN !== 'number' || priceBGN <= 0) return '';
    const priceEUR = priceBGN / 1.95583;
    return `${priceBGN.toFixed(2)} лв. / ${priceEUR.toFixed(2)} €`;
  }
  
  function getProductIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  }
  
  async function fetchProduct(id) {
    const res = await fetch(`${API_BASE}/api/Products/${id}`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  }
  
  function showMainImage(imageUrl, alt) {
    if (imageUrl) {
      mainImage.src = `${API_BASE}${imageUrl}`;
      mainImage.alt = alt || '';
      mainImage.style.display = 'block';
      noImagePlaceholder.style.display = 'none';
    } else {
      mainImage.style.display = 'none';
      noImagePlaceholder.style.display = 'flex';
    }
  }
  
  function createThumbnailGallery(images) {
    if (!images || images.length <= 1) {
      thumbnailGallery.style.display = 'none';
      return;
    }
    
    thumbnailGallery.style.display = 'flex';
    thumbnailGallery.innerHTML = images.map((img, index) => `
      <div class="thumbnail ${index === 0 ? 'active' : ''}" onclick="selectThumbnail(${index})">
        <img src="${API_BASE}${img.url}" alt="${escapeHtml(img.alt || '')}" loading="lazy">
      </div>
    `).join('');
  }
  
  window.selectThumbnail = function(index) {
    const thumbnails = $$('.thumbnail');
    thumbnails.forEach((thumb, i) => {
      thumb.classList.toggle('active', i === index);
    });
    
    // Get current product data from window
    if (window.currentProduct && window.currentProduct.images && window.currentProduct.images[index]) {
      const selectedImage = window.currentProduct.images[index];
      showMainImage(selectedImage.url, selectedImage.alt);
    }
  };
  
  function renderProduct(product) {
    // Store product data globally for thumbnail selection
    window.currentProduct = product;
    
    // Update title and meta
    document.title = `${product.name} - Stone Craft`;
    productTitle.textContent = product.name;
    
    // Update breadcrumb
    const categoryName = categoryLabel(product.category);
    breadcrumbCategory.textContent = `Паметници от ${categoryName}`;
    breadcrumbCategory.href = `products.html?category=${product.category}`;
    breadcrumbProduct.textContent = product.name;
    
    // Update category badge
    productCategory.textContent = categoryName;
    productCategory.className = `product-category-badge category-${product.category}`;
    
    // Update price
    const priceText = formatPrice(product.price);
    if (priceText) {
      productPrice.innerHTML = `<strong>${priceText}</strong>`;
      productPrice.style.display = 'block';
    } else {
      productPrice.innerHTML = '<strong>Цена при запитване</strong>';
      productPrice.style.display = 'block';
    }
    
    // Update description
    if (product.description && product.description.trim()) {
      productDescription.innerHTML = `<p>${escapeHtml(product.description)}</p>`;
    }
    
    // Update images
    const images = Array.isArray(product.images) ? product.images : [];
    if (images.length > 0) {
      showMainImage(images[0].url, images[0].alt);
      createThumbnailGallery(images);
    } else {
      showMainImage(null);
      thumbnailGallery.style.display = 'none';
    }
  }
  
  function showError() {
    loadingState.style.display = 'none';
    productDetails.style.display = 'none';
    errorState.style.display = 'block';
  }
  
  function showProduct() {
    loadingState.style.display = 'none';
    errorState.style.display = 'none';
    productDetails.style.display = 'block';
  }
  
  async function loadProduct() {
    const productId = getProductIdFromUrl();
    
    if (!productId) {
      showError();
      return;
    }
    
    try {
      const product = await fetchProduct(productId);
      renderProduct(product);
      showProduct();
    } catch (error) {
      console.error('Грешка при зареждане на продукт:', error);
      showError();
    }
  }
  
  function init() {
    loadProduct();
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
