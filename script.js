// Global variables
let currentSlide = 0;
let slideInterval;
const slides = document.querySelectorAll('.slide');
const dots = document.querySelectorAll('.dot');
let touchStartX = 0;
let touchEndX = 0;

// DOM Elements
const menuToggle = document.querySelector('.menu-toggle');
const sidePanel = document.getElementById('sidePanel');
const closePanel = document.getElementById('closePanel');
const overlay = document.getElementById('overlay');
const mainContent = document.getElementById('mainContent');
const qrPage = document.getElementById('qrPage');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeSlider();
    setupEventListeners();
    setupArtworkSlider();
    setupScrollAnimations();
    setupSearchFunctionality();
});

// Slider functionality
function initializeSlider() {
    startAutoSlide();
    
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            goToSlide(index);
            resetAutoSlide();
        });
    });
}

function goToSlide(slideIndex) {
    // Remove active class from current slide and dot
    slides[currentSlide].classList.remove('active');
    dots[currentSlide].classList.remove('active');
    
    // Add active class to new slide and dot
    currentSlide = slideIndex;
    slides[currentSlide].classList.add('active');
    dots[currentSlide].classList.add('active');
}

function nextSlide() {
    const nextIndex = (currentSlide + 1) % slides.length;
    goToSlide(nextIndex);
}

function startAutoSlide() {
    slideInterval = setInterval(nextSlide, 4000);
}

function resetAutoSlide() {
    clearInterval(slideInterval);
    startAutoSlide();
}

// Menu functionality
function setupEventListeners() {
    // Menu toggle
    menuToggle.addEventListener('click', openSidePanel);
    closePanel.addEventListener('click', closeSidePanel);
    overlay.addEventListener('click', closeSidePanel);

    // ADD THIS: New artwork details navigation
    const viewAllBtn = document.getElementById('viewAllArtworks');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', function() {
            window.location.href = 'artwork-details.html';
        });
    }
    
    // Artwork details navigation
    viewAllBtn.addEventListener('click', showArtworkDetails);
    backBtn.addEventListener('click', showMainContent);
    
    // Individual artwork items click handlers
    // setupArtworkItemClickHandlers();
    
    // QR page triggers
    setupQRPageTriggers();
    
    // Window resize handler
    window.addEventListener('resize', handleWindowResize);
}

function setupQRPageTriggers() {
    // Add QR trigger to search icon
    const searchIcon = document.querySelector('.search-icon');
    if (searchIcon) {
        searchIcon.addEventListener('click', showQRPage);
    }
    
    // Add long press detection for mobile QR trigger
    let pressTimer;
    document.addEventListener('touchstart', (e) => {
        if (e.target.closest('.artwork-item')) {
            pressTimer = setTimeout(() => {
                showQRPage();
            }, 1000);
        }
    });
    
    document.addEventListener('touchend', () => {
        clearTimeout(pressTimer);
    });
}

function openSidePanel() {
    sidePanel.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeSidePanel() {
    sidePanel.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Artwork slider functionality
function setupArtworkSlider() {
    const artworksSlider = document.querySelector('.artworks-slider');
    let isDown = false;
    let startX;
    let scrollLeft;

    // Mouse events
    artworksSlider.addEventListener('mousedown', (e) => {
        isDown = true;
        artworksSlider.style.cursor = 'grabbing';
        startX = e.pageX - artworksSlider.offsetLeft;
        scrollLeft = artworksSlider.scrollLeft;
        e.preventDefault();
    });

    artworksSlider.addEventListener('mouseleave', () => {
        isDown = false;
        artworksSlider.style.cursor = 'grab';
    });

    artworksSlider.addEventListener('mouseup', () => {
        isDown = false;
        artworksSlider.style.cursor = 'grab';
    });

    artworksSlider.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - artworksSlider.offsetLeft;
        const walk = (x - startX) * 2;
        artworksSlider.scrollLeft = scrollLeft - walk;
    });

    // Touch events for mobile
    artworksSlider.addEventListener('touchstart', (e) => {
        startX = e.touches[0].pageX - artworksSlider.offsetLeft;
        scrollLeft = artworksSlider.scrollLeft;
    });

    artworksSlider.addEventListener('touchmove', (e) => {
        if (!startX) return;
        const x = e.touches[0].pageX - artworksSlider.offsetLeft;
        const walk = (x - startX) * 1.5;
        artworksSlider.scrollLeft = scrollLeft - walk;
    });

    // Set initial cursor style
    artworksSlider.style.cursor = 'grab';
}

function showQRPage() {
    qrPage.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Add entrance animation
    const qrBackground = document.querySelector('.qr-background');
    if (qrBackground) {
        qrBackground.style.transform = 'scale(0.8)';
        qrBackground.style.opacity = '0';
        setTimeout(() => {
            qrBackground.style.transition = 'all 0.4s ease';
            qrBackground.style.transform = 'scale(1)';
            qrBackground.style.opacity = '1';
        }, 50);
    }
    
    // Auto-hide QR page after 8 seconds
    setTimeout(() => {
        if (qrPage.classList.contains('active')) {
            hideQRPage();
        }
    }, 8000);
}

function hideQRPage() {
    const qrBackground = document.querySelector('.qr-background');
    if (qrBackground) {
        qrBackground.style.transform = 'scale(0.8)';
        qrBackground.style.opacity = '0';
        setTimeout(() => {
            qrPage.classList.remove('active');
            document.body.style.overflow = 'auto';
            qrBackground.style.transform = 'scale(1)';
            qrBackground.style.opacity = '1';
        }, 300);
    } else {
        qrPage.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

// Search functionality
function setupSearchFunctionality() {
    const searchIcon = document.querySelector('.search-icon');
    
    // Create search overlay
    const searchOverlay = document.createElement('div');
    searchOverlay.className = 'search-overlay';
    searchOverlay.innerHTML = `
        <div class="search-container">
            <input type="text" class="search-input" placeholder="Search artworks...">
            <button class="search-close">&times;</button>
        </div>
        <div class="search-results"></div>
    `;
    document.body.appendChild(searchOverlay);
    
    // Add search overlay styles
    const searchStyles = document.createElement('style');
    searchStyles.textContent = `
        .search-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 75, 73, 0.95);
            z-index: 1003;
            display: none;
            padding: 80px 20px 20px;
        }
        .search-overlay.active {
            display: block;
        }
        .search-container {
            max-width: 600px;
            margin: 0 auto;
            position: relative;
        }
        .search-input {
            width: 100%;
            padding: 20px;
            font-size: 1.2rem;
            border: none;
            border-radius: 10px;
            outline: none;
        }
        .search-close {
            position: absolute;
            right: 15px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            font-size: 2rem;
            color: #666;
            cursor: pointer;
        }
        .search-results {
            max-width: 600px;
            margin: 20px auto 0;
            color: white;
        }
    `;
    document.head.appendChild(searchStyles);
    
    const searchInput = searchOverlay.querySelector('.search-input');
    const searchClose = searchOverlay.querySelector('.search-close');
    const searchResults = searchOverlay.querySelector('.search-results');
    
    // Search functionality (demo - you can enhance this)
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        if (query.length > 2) {
            // Mock search results
            searchResults.innerHTML = `
                <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; margin: 10px 0;">
                    <h3>Contemporary Vision</h3>
                    <p>Modern artistic expression matching "${query}"</p>
                </div>
            `;
        } else {
            searchResults.innerHTML = '';
        }
    });
    
    searchClose.addEventListener('click', () => {
        searchOverlay.classList.remove('active');
        document.body.style.overflow = 'auto';
        searchInput.value = '';
        searchResults.innerHTML = '';
    });
}

// Scroll animations
function setupScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe artwork items for scroll animations
    document.querySelectorAll('.artwork-item').forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(30px)';
        item.style.transition = `all 0.6s ease ${index * 0.1}s`;
        observer.observe(item);
    });
}

// Window resize handler
function handleWindowResize() {
    // Adjust slider on resize
    if (window.innerWidth <= 768) {
        // Mobile adjustments
        clearInterval(slideInterval);
        startAutoSlide();
    }
}

// Event listeners for clicks outside elements
document.addEventListener('click', (e) => {
    // Close QR page when clicking outside
    if (qrPage.classList.contains('active') && !e.target.closest('.qr-background')) {
        hideQRPage();
    }
    
    // Close search overlay when clicking outside
    const searchOverlay = document.querySelector('.search-overlay');
    if (searchOverlay && searchOverlay.classList.contains('active') && 
        !e.target.closest('.search-container')) {
        searchOverlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
});

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (sidePanel.classList.contains('active')) {
            closeSidePanel();
        } else if (qrPage.classList.contains('active')) {
            hideQRPage();
        } else if (document.querySelector('.search-overlay.active')) {
            document.querySelector('.search-overlay').classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    }
    
    // Arrow keys for slider - remove the artworkDetailsPage check
    if (e.key === 'ArrowLeft') {
        const prevIndex = currentSlide === 0 ? slides.length - 1 : currentSlide - 1;
        goToSlide(prevIndex);
        resetAutoSlide();
    } else if (e.key === 'ArrowRight') {
        const nextIndex = (currentSlide + 1) % slides.length;
        goToSlide(nextIndex);
        resetAutoSlide();
    }
    
    // Spacebar to pause/resume slider - remove the artworkDetailsPage check
    if (e.key === ' ') {
        e.preventDefault();
        if (slideInterval) {
            clearInterval(slideInterval);
            slideInterval = null;
        } else {
            startAutoSlide();
        }
    }
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
        
        // Close side panel if open
        closeSidePanel();
    });
});

// Performance optimization - pause animations when page is not visible
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        clearInterval(slideInterval);
    } else {
        // Remove the artworkDetailsPage check
        startAutoSlide();
    }
});

// Add loading states and error handling
window.addEventListener('load', () => {
    // Hide any loading indicators
    const loadingIndicators = document.querySelectorAll('.loading');
    loadingIndicators.forEach(indicator => {
        indicator.style.display = 'none';
    });
    
    // Add loaded class to body for CSS transitions
    document.body.classList.add('loaded');
});

// Error handling for images
document.querySelectorAll('img').forEach(img => {
    img.addEventListener('error', function() {
        this.style.background = '#f0f0f0';
        this.style.display = 'flex';
        this.style.alignItems = 'center';
        this.style.justifyContent = 'center';
        this.innerHTML = '<span style="color: #666;">Image not available</span>';
    });
});

document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;
    
    if (Math.abs(diff) > swipeThreshold) {
        // Remove the artworkDetailsPage check
        if (!sidePanel.classList.contains('active') &&
            !qrPage.classList.contains('active')) {
            if (diff > 0) {
                // Swipe left - next slide
                nextSlide();
                resetAutoSlide();
            } else {
                // Swipe right - previous slide
                const prevIndex = currentSlide === 0 ? slides.length - 1 : currentSlide - 1;
                goToSlide(prevIndex);
                resetAutoSlide();
            }
        }
    }
}