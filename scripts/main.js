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
        });
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
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                
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
        this.syncHeight();
        this.setupResizeObserver();
        this.setupImageLoadHandler();
    }
    
    setupInitialState() {
        // Ensure only the first image is visible initially
        this.bannerThumbs.forEach((img, i) => {
            img.classList.toggle('active', i === this.currentIndex);
        });
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
        this.bannerThumbs[this.currentIndex]?.classList.remove('active');
        this.currentIndex = (index + this.bannerThumbs.length) % this.bannerThumbs.length;
        this.bannerThumbs[this.currentIndex]?.classList.add('active');
    }

    next() {
        this.setActive(this.currentIndex + 1);
    }

    prev() {
        this.setActive(this.currentIndex - 1);
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
        const criticalImages = [
            'images/slide1.jpg',
            'images/slide2.jpg',
            'images/slide3.jpg'
        ];
        
        criticalImages.forEach(src => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = src;
            document.head.appendChild(link);
        });
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
            // Initialize all modules
            this.modules.navigation = new NavigationModule();
            this.modules.banner = new BannerModule();
            this.modules.gallery = new GalleryModule();
            this.modules.contactForm = new ContactFormModule();
            this.modules.scrollAnimations = new ScrollAnimationsModule();
            this.modules.performance = new PerformanceModule();
            
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
