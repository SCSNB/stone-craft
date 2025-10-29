// Main JavaScript file for Pametnik.net website
// Using modular structure with TypeScript-like organization

// Navigation Module
class NavigationModule {
    constructor() {
        this.header = document.getElementById('header');
        this.burgerMenu = document.getElementById('burgerMenu');
        this.nav = document.getElementById('nav');
        this.navLinks = document.querySelectorAll('.nav-link');
        
        this.init();
    }

    updateLayoutOffset() {
        try {
            const layout = document.querySelector('.page-layout');
            if (!layout || !this.header) return;
            const offset = this.header.offsetHeight || 0;
            layout.style.marginTop = `${offset}px`;
        } catch (_) {}
    }
    
    init() {
        this.setupScrollEffect();
        this.updateLayoutOffset();
        this.setupMobileMenu();
        this.setupSmoothScrolling();
        window.addEventListener('resize', Utils.debounce(() => this.updateLayoutOffset(), 100));
    }
    
    setupScrollEffect() {
        let lastScrollY = window.scrollY;
        
        window.addEventListener('scroll', () => {
            const currentScrollY = window.scrollY;
            
            // Add scrolled class for styling
            if (currentScrollY > 50) {
                this.header.classList.add('scrolled');
            } else {
                this.header.classList.remove('scrolled');
            }
            
            lastScrollY = currentScrollY;
        }, { passive: true });
    }
    
    setupMobileMenu() {
        this.burgerMenu.addEventListener('click', () => {
            this.burgerMenu.classList.toggle('active');
            this.nav.classList.toggle('active');
            document.body.style.overflow = this.nav.classList.contains('active') ? 'hidden' : '';
        });
        
        // Close mobile menu when clicking on a link
        this.navLinks.forEach(link => {
            link.addEventListener('click', () => {
                this.burgerMenu.classList.remove('active');
                this.nav.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.nav.contains(e.target) && !this.burgerMenu.contains(e.target)) {
                this.burgerMenu.classList.remove('active');
                this.nav.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
    
    setupSmoothScrolling() {
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href') || '';
                // Only intercept in-page anchors starting with '#'
                if (!href.startsWith('#')) {
                    return; // allow normal navigation to e.g. gallery.html
                }
                e.preventDefault();
                const targetElement = document.querySelector(href);
                if (targetElement) {
                    const headerHeight = this.header.offsetHeight;
                    const targetPosition = targetElement.offsetTop - headerHeight;
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }
}

// Banner Module (replaces Slider)
class BannerModule {
    constructor() {
        this.container = document.querySelector('.banner-images');
        this.bannerThumbs = this.container ? this.container.querySelectorAll('.banner-thumb') : [];
        this.bannerText = document.querySelector('.banner-text');
        // Slider controls (prev/next buttons)
        this.prevBtn = document.querySelector('.slider-btn.prev');
        this.nextBtn = document.querySelector('.slider-btn.next');
        this.currentIndex = 0;
        this.interval = null;
        this.intervalMs = 3500;
        // Height tuning
        this.heightScale = 1.35; // scale relative to text block height
        this.minHeightDesktop = 320;
        this.maxHeightDesktop = 640;
        this.minHeightTablet = 280;
        this.maxHeightTablet = 560;
        this.minHeightMobile = 240;
        this.maxHeightMobile = 480;
        this.init();
    }
    
    init() {
        if (!this.container || !this.bannerThumbs.length) return;
        this.setupInitialState();
        this.startAutoSlide();
        this.setupHoverPause();
        this.setupControlButtons();
        this.syncHeight();
        this.setupResizeObserver();
        this.setupImageLoadHandler();
    }
    
    setupInitialState() {
        // Hide all, show only the first (or currentIndex) explicitly
        this.bannerThumbs.forEach((img, i) => {
            img.classList.remove('active');
            img.style.display = 'none';
        });
        const first = this.bannerThumbs[this.currentIndex] || this.bannerThumbs[0];
        if (first) {
            first.classList.add('active');
            first.style.display = 'block';
        }
    }

    startAutoSlide() {
        this.stopAutoSlide();
        this.interval = setInterval(() => this.next(), this.intervalMs);
    }

    stopAutoSlide() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    setActive(index) {
        if (!this.bannerThumbs.length) return;
        // Hide all first (robust against CSS stacking)
        this.bannerThumbs.forEach(img => {
            img.classList.remove('active');
            img.style.display = 'none';
        });
        // Compute new index
        this.currentIndex = (index + this.bannerThumbs.length) % this.bannerThumbs.length;
        const active = this.bannerThumbs[this.currentIndex];
        if (active) {
            active.classList.add('active');
            active.style.display = 'block';
        }
    }

    next() {
        this.setActive(this.currentIndex + 1);
    }

    prev() {
        this.setActive(this.currentIndex - 1);
    }

    setupControlButtons() {
        const restart = () => {
            this.stopAutoSlide();
            // small delay before restarting to avoid instant change
            setTimeout(() => this.startAutoSlide(), 2000);
        };
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.prev();
                restart();
            });
        }
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.next();
                restart();
            });
        }
    }

    setupHoverPause() {
        this.container.addEventListener('mouseenter', () => this.stopAutoSlide());
        this.container.addEventListener('mouseleave', () => this.startAutoSlide());
    }

    syncHeight() {
        if (!this.container) return;
        // For the new layout, use a fixed responsive height
        const w = window.innerWidth;
        let desired;
        if (w <= 480) {
            desired = 300;
        } else if (w <= 1024) {
            desired = 400;
        } else {
            desired = 500;
        }
        this.container.style.height = `${desired}px`;
    }

    setupResizeObserver() {
        const onResize = Utils.debounce(() => this.syncHeight(), 150);
        window.addEventListener('resize', onResize);
        // Observe content changes in text block as well
        if (window.ResizeObserver && this.bannerText) {
            const ro = new ResizeObserver(() => this.syncHeight());
            ro.observe(this.bannerText);
            this._resizeObserver = ro;
        }
    }

    setupImageLoadHandler() {
        // Ensure height recalculates once images/fonts are loaded
        const recalc = () => this.syncHeight();
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(recalc).catch(() => {});
        }
        this.bannerThumbs.forEach(img => {
            if (img.complete) return; // already loaded
            img.addEventListener('load', recalc, { once: true });
            img.addEventListener('error', recalc, { once: true });
        });
        window.addEventListener('load', recalc);
    }
}

// Gallery Module
class GalleryModule {
    constructor() {
        this.isGalleryPage = (document.body && document.body.dataset && document.body.dataset.page === 'gallery');
        this.galleryItems = document.querySelectorAll('.gallery-item');
        this.lightbox = document.getElementById('lightbox');
        this.lightboxImage = document.getElementById('lightboxImage');
        this.lightboxClose = document.getElementById('lightboxClose');
        this.lightboxPrev = document.getElementById('lightboxPrev');
        this.lightboxNext = document.getElementById('lightboxNext');
        
        this.currentImageIndex = 0;
        this.images = Array.from(this.galleryItems).map(item => ({
            src: item.dataset.src,
            alt: item.querySelector('img').alt
        }));
        
        this.init();
    }
    
    init() {
        // Only enable lightbox interactions on the dedicated Gallery page
        if (!this.isGalleryPage) {
            return;
        }
        this.setupGalleryItems();
        this.setupLightboxControls();
        this.setupKeyboardNavigation();
    }
    
    setupGalleryItems() {
        this.galleryItems.forEach((item, index) => {
            item.addEventListener('click', () => {
                this.openLightbox(index);
            });
        });
    }
    
    setupLightboxControls() {
        this.lightboxClose.addEventListener('click', () => {
            this.closeLightbox();
        });
        
        this.lightboxPrev.addEventListener('click', () => {
            this.previousImage();
        });
        
        this.lightboxNext.addEventListener('click', () => {
            this.nextImage();
        });
        
        this.lightbox.addEventListener('click', (e) => {
            if (e.target === this.lightbox) {
                this.closeLightbox();
            }
        });
    }
    
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (!this.lightbox.classList.contains('active')) return;
            
            switch (e.key) {
                case 'Escape':
                    this.closeLightbox();
                    break;
                case 'ArrowLeft':
                    this.previousImage();
                    break;
                case 'ArrowRight':
                    this.nextImage();
                    break;
            }
        });
    }
    
    openLightbox(index) {
        this.currentImageIndex = index;
        this.updateLightboxImage();
        this.lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    closeLightbox() {
        this.lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    previousImage() {
        this.currentImageIndex = (this.currentImageIndex - 1 + this.images.length) % this.images.length;
        this.updateLightboxImage();
    }
    
    nextImage() {
        this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
        this.updateLightboxImage();
    }
    
    updateLightboxImage() {
        const image = this.images[this.currentImageIndex];
        this.lightboxImage.src = image.src;
        this.lightboxImage.alt = image.alt;
    }
}

// Gallery Products Module (fetches and displays all product images in gallery)
class GalleryProductsModule {
    constructor() {
        this.isGalleryPage = (document.body && document.body.dataset && document.body.dataset.page === 'gallery');
        this.galleryGrid = document.getElementById('galleryGrid');
        const hostname = window.location.hostname;
        const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
        this.API_BASE = isLocal ? 'http://localhost:5080' : window.location.origin;
        if (this.isGalleryPage && this.galleryGrid) {
            this.init();
        }
    }

    async init() {
        try {
            const products = await this.fetchProducts();
            this.renderGallery(products);
        } catch (err) {
            console.error('Грешка при зареждане на продукти за галерията:', err);
            this.galleryGrid.innerHTML = '<p style="color:#e74c3c">Неуспешно зареждане на галерията. Опитайте отново по-късно.</p>';
        }
    }

    async fetchProducts() {
        const res = await fetch(`${this.API_BASE}/api/Products`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    }

    renderGallery(products) {
        if (!Array.isArray(products) || products.length === 0) {
            this.galleryGrid.innerHTML = '<p>Все още няма добавени продукти в галерията.</p>';
            return;
        }

        // Filter products with images and get all images
        const productImages = [];
        products.forEach(product => {
            if (Array.isArray(product.images) && product.images.length > 0) {
                product.images.forEach(image => {
                    if (image && image.url) {
                        const imageUrl = image.url.startsWith('http') ? image.url : `${this.API_BASE}${image.url}`;
                        productImages.push({
                            src: imageUrl,
                            alt: product.name || 'Продукт',
                            productName: product.name || 'Продукт',
                            productId: product.id,
                            // Create a thumbnail version of the URL (assuming Cloudinary or similar)
                            thumbnail: this.createThumbnailUrl(imageUrl, 200, 150) // width: 200px, height: 150px
                        });
                    }
                });
            }
        });

        if (productImages.length === 0) {
            this.galleryGrid.innerHTML = '<p>Няма налични снимки в галерията.</p>';
            return;
        }
        
        // Update the sidebar gallery with thumbnails
        this.updateSidebarGallery(productImages);

        // Clear existing gallery items
        this.galleryGrid.innerHTML = '';

        // Add new gallery items for each product image
        productImages.forEach((img, index) => {
            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';
            galleryItem.dataset.src = img.src;
            galleryItem.dataset.index = index;
            
            galleryItem.innerHTML = `
                <img loading="lazy" decoding="async" src="${img.src}" alt="${this.escapeHtml(img.alt)}">
                <div class="gallery-info">
                    <h4>${this.escapeHtml(img.productName)}</h4>
                    <a href="#" class="details-btn" onclick="return false;">Детайли</a>
                </div>
            `;
            
            galleryItem.addEventListener('click', (e) => {
                e.preventDefault();
                const lightbox = document.getElementById('lightbox');
                const lightboxImg = document.getElementById('lightboxImage');
                if (lightbox && lightboxImg) {
                    lightboxImg.src = img.src;
                    lightboxImg.alt = img.alt;
                    lightbox.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
            });
            
            this.galleryGrid.appendChild(galleryItem);
        });

        // Reinitialize gallery module with new items
        if (window.app && window.app.getModule) {
            const galleryModule = window.app.getModule('gallery');
            if (galleryModule) {
                // Reinitialize the gallery with new items
                galleryModule.galleryItems = document.querySelectorAll('.gallery-item');
                galleryModule.images = Array.from(galleryModule.galleryItems).map(item => ({
                    src: item.dataset.src,
                    alt: item.querySelector('img').alt
                }));
            }
        }
    }

    escapeHtml(str) {
        if (typeof str !== 'string') return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    
    // Create a thumbnail URL from the original image URL
    createThumbnailUrl(originalUrl, width, height) {
        if (!originalUrl) return '';
        
        // If it's a Cloudinary URL, add resize parameters
        if (originalUrl.includes('res.cloudinary.com')) {
            // Insert resize parameters before the file extension
            return originalUrl.replace(/upload\//, `upload/c_fill,w_${width},h_${height},f_auto/`);
        }
        
        // For other image sources, return the original URL
        // You might want to add handling for other image services here
        return originalUrl;
    }
    
    // Update the sidebar gallery with thumbnails
    updateSidebarGallery(images) {
        const sidebarGallery = document.querySelector('.sidebar-gallery');
        if (!sidebarGallery) return;
        
        // Take up to 6 random images for the sidebar
        const randomImages = [...images]
            .sort(() => 0.5 - Math.random())
            .slice(0, 6);
        
        // Create the HTML for the sidebar gallery
        const galleryHtml = randomImages.map((img, index) => `
            <a class="gallery-thumb" href="#" data-index="${index}" aria-label="Разгледай снимка - ${this.escapeHtml(img.alt)}">
                <img loading="lazy" decoding="async" 
                     src="${img.thumbnail || img.src}" 
                     alt="${this.escapeHtml(img.alt)}">
            </a>
        `).join('');
        
        // Update the sidebar gallery
        sidebarGallery.innerHTML = galleryHtml;
        
        // Add click handlers to the thumbnails
        sidebarGallery.querySelectorAll('.gallery-thumb').forEach((thumb, index) => {
            thumb.addEventListener('click', (e) => {
                e.preventDefault();
                // Open the lightbox with the corresponding image
                const lightbox = document.getElementById('lightbox');
                const lightboxImg = document.getElementById('lightboxImage');
                if (lightbox && lightboxImg) {
                    const img = randomImages[index];
                    lightboxImg.src = img.src;
                    lightboxImg.alt = img.alt;
                    lightbox.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
            });
        });
    }
}

// Products Module (fetches from API on catalog page)
class ProductsModule {
    constructor() {
        this.isCatalogPage = (document.body && document.body.dataset && document.body.dataset.page === 'catalog');
        this.container = document.getElementById('dynamic-products');
        const hostname = window.location.hostname;
        const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
        this.API_BASE = isLocal ? 'http://localhost:5080' : window.location.origin;
        if (this.isCatalogPage && this.container) {
            this.init();
        }
    }

    async init() {
        try {
            const products = await this.fetchProducts();
            this.renderProducts(products);
        } catch (err) {
            console.error('Грешка при зареждане на продукти:', err);
            this.container.innerHTML = '<p style="color:#e74c3c">Неуспешно зареждане на продукти. Опитайте отново по-късно.</p>';
        }
    }

    async fetchProducts() {
        const res = await fetch(`${this.API_BASE}/api/Products`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    }

    renderProducts(items) {
        if (!Array.isArray(items) || items.length === 0) {
            this.container.innerHTML = '<p>Все още няма налични продукти.</p>';
            return;
        }
        const html = items.map(p => this.productCard(p)).join('');
        this.container.innerHTML = html;
    }

    productCard(p) {
        let priceDisplay = '';
        if (typeof p.price === 'number' && p.price > 0) {
            const priceEUR = (p.price / 1.95583).toFixed(2);
            priceDisplay = `<div class="product-price">${priceEUR} €</div>`;
        } else if (p.price) {
            priceDisplay = `<div class="product-price">${p.price}</div>`;
        }
        
        const img = (Array.isArray(p.images) && p.images.length > 0) ? (p.images[0].url || '') : '';
        const safeImg = img ? `<img src="${img}" alt="${this.escapeHtml(p.name)}">` : '';
        return `
            <article class="product-card">
                <div class="product-media">${safeImg}</div>
                <div class="product-body">
                    <h3 class="product-title">${this.escapeHtml(p.name)}</h3>
                    ${p.description ? `<p class="product-desc">${this.escapeHtml(p.description)}</p>` : ''}
                    ${priceDisplay}
                </div>
            </article>
        `;
    }

    escapeHtml(str) {
        if (typeof str !== 'string') return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    
    // Create a thumbnail URL from the original image URL
    createThumbnailUrl(originalUrl, width, height) {
        if (!originalUrl) return '';
        
        // If it's a Cloudinary URL, add resize parameters
        if (originalUrl.includes('res.cloudinary.com')) {
            // Insert resize parameters before the file extension
            return originalUrl.replace(/upload\//, `upload/c_fill,w_${width},h_${height},f_auto/`);
        }
        
        // For other image sources, return the original URL
        // You might want to add handling for other image services here
        return originalUrl;
    }
    
    // Update the sidebar gallery with thumbnails
    updateSidebarGallery(images) {
        const sidebarGallery = document.querySelector('.sidebar-gallery');
        if (!sidebarGallery) return;
        
        // Take up to 6 random images for the sidebar
        const randomImages = [...images]
            .sort(() => 0.5 - Math.random())
            .slice(0, 6);
        
        // Create the HTML for the sidebar gallery
        const galleryHtml = randomImages.map((img, index) => `
            <a class="gallery-thumb" href="#" data-index="${index}" aria-label="Разгледай снимка - ${this.escapeHtml(img.alt)}">
                <img loading="lazy" decoding="async" 
                     src="${img.thumbnail || img.src}" 
                     alt="${this.escapeHtml(img.alt)}">
            </a>
        `).join('');
        
        // Update the sidebar gallery
        sidebarGallery.innerHTML = galleryHtml;
        
        // Add click handlers to the thumbnails
        sidebarGallery.querySelectorAll('.gallery-thumb').forEach((thumb, index) => {
            thumb.addEventListener('click', (e) => {
                e.preventDefault();
                // Open the lightbox with the corresponding image
                const lightbox = document.getElementById('lightbox');
                const lightboxImg = document.getElementById('lightboxImage');
                if (lightbox && lightboxImg) {
                    const img = randomImages[index];
                    lightboxImg.src = img.src;
                    lightboxImg.alt = img.alt;
                    lightbox.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
            });
        });
    }
}

// Contact Form Module
class ContactFormModule {
    constructor() {
        this.form = document.getElementById('contactForm');
        this.init();
    }
    
    init() {
        this.setupFormSubmission();
        this.setupFormValidation();
    }
    
    setupFormSubmission() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            if (this.validateForm()) {
                this.submitForm();
            }
        });
    }
    
    setupFormValidation() {
        const inputs = this.form.querySelectorAll('input, textarea');
        
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });
            
            input.addEventListener('input', () => {
                this.clearFieldError(input);
            });
        });
    }
    
    validateForm() {
        const inputs = this.form.querySelectorAll('input[required], textarea[required]');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });
        
        return isValid;
    }
    
    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';
        
        // Required field validation
        if (field.hasAttribute('required') && !value) {
            isValid = false;
            errorMessage = 'Това поле е задължително';
        }
        
        // Email validation
        if (field.type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                errorMessage = 'Моля въведете валиден имейл адрес';
            }
        }
        
        // Phone validation
        if (field.type === 'tel' && value) {
            const phoneRegex = /^[0-9+\-\s()]+$/;
            if (!phoneRegex.test(value)) {
                isValid = false;
                errorMessage = 'Моля въведете валиден телефонен номер';
            }
        }
        
        this.showFieldError(field, isValid ? '' : errorMessage);
        return isValid;
    }
    
    showFieldError(field, message) {
        this.clearFieldError(field);
        
        if (message) {
            field.style.borderColor = '#e74c3c';
            
            const errorElement = document.createElement('span');
            errorElement.className = 'field-error';
            errorElement.textContent = message;
            errorElement.style.color = '#e74c3c';
            errorElement.style.fontSize = '0.875rem';
            errorElement.style.marginTop = '0.25rem';
            errorElement.style.display = 'block';
            
            field.parentNode.appendChild(errorElement);
        } else {
            field.style.borderColor = '#27ae60';
        }
    }
    
    clearFieldError(field) {
        field.style.borderColor = '';
        const errorElement = field.parentNode.querySelector('.field-error');
        if (errorElement) {
            errorElement.remove();
        }
    }
    
    submitForm() {
        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData);
        
        // Show loading state
        const submitButton = this.form.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Изпращане...';
        submitButton.disabled = true;
        
        // Simulate form submission (replace with actual API call)
        setTimeout(() => {
            this.showSuccessMessage();
            this.form.reset();
            
            // Reset button
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }, 2000);
    }
    
    showSuccessMessage() {
        const message = document.createElement('div');
        message.className = 'success-message';
        message.innerHTML = `
            <div style="
                background: #27ae60;
                color: white;
                padding: 1rem;
                border-radius: 5px;
                margin-bottom: 1rem;
                text-align: center;
            ">
                <i class="fas fa-check-circle" style="margin-right: 0.5rem;"></i>
                Съобщението е изпратено успешно! Ще се свържем с вас скоро.
            </div>
        `;
        
        this.form.parentNode.insertBefore(message, this.form);
        
        setTimeout(() => {
            message.remove();
        }, 5000);
    }
}

// Scroll Animations Module
class ScrollAnimationsModule {
    constructor() {
        this.animatedElements = document.querySelectorAll('.service-card, .about-content, .gallery-item');
        this.init();
    }
    
    init() {
        this.setupIntersectionObserver();
    }
    
    setupIntersectionObserver() {
        const options = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                    observer.unobserve(entry.target);
                }
            });
        }, options);
        
        this.animatedElements.forEach(element => {
            observer.observe(element);
        });
    }
}

// Utility Functions
class Utils {
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }
    
    static isMobile() {
        return window.innerWidth <= 768;
    }
    
    static isTablet() {
        return window.innerWidth > 768 && window.innerWidth <= 1024;
    }
    
    static isDesktop() {
        return window.innerWidth > 1024;
    }
}

// Performance Optimization Module
class PerformanceModule {
    constructor() {
        this.init();
    }
    
    init() {
        this.lazyLoadImages();
        this.preloadCriticalImages();
    }
    
    lazyLoadImages() {
        const images = document.querySelectorAll('img[data-src]');
        
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    }
    
    preloadCriticalImages() {
        try {
            // Preload actual banner images present in the DOM to avoid 404s
            const bannerImgs = document.querySelectorAll('.banner-images .banner-thumb');
            bannerImgs.forEach(img => {
                const src = img.getAttribute('src');
                if (!src) return;
                const link = document.createElement('link');
                link.rel = 'preload';
                link.as = 'image';
                link.href = src;
                document.head.appendChild(link);
            });
        } catch (_) {}
    }
}

// Main Application Class
class App {
    constructor() {
        this.modules = {};
        this.init();
    }
    
    init() {
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initializeModules();
            });
        } else {
            this.initializeModules();
        }
    }
    
    initializeModules() {
        try {
            // Initialize modules
            this.modules = {
                navigation: new NavigationModule(),
                banner: new BannerModule(),
                gallery: new GalleryModule(),
                products: new ProductsModule(),
                galleryProducts: new GalleryProductsModule(),
                contactForm: new ContactFormModule(),
                scrollAnimations: new ScrollAnimationsModule(),
                performance: new PerformanceModule()
            };
            console.log('All modules initialized successfully');
        } catch (error) {
            console.error('Error initializing modules:', error);
        }
    }
    
    // Public API for external access
    getModule(name) {
        return this.modules[name];
    }
}

// Initialize the application
const app = new App();

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { App, Utils };
}
