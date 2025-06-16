// Global variables
let currentSlide = 0;
let slideInterval;
const slides = document.querySelectorAll(".slide");
const dots = document.querySelectorAll(".dot");
let touchStartX = 0;
let touchEndX = 0;

// DOM Elements
const menuToggle = document.querySelector(".menu-toggle");
const sidePanel = document.getElementById("sidePanel");
const closePanel = document.getElementById("closePanel");
const overlay = document.getElementById("overlay");
const mainContent = document.getElementById("mainContent");
const qrPage = document.getElementById("qrPage");

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  initializeSlider();
  setupEventListeners();
  setupArtworkSlider();
  setupScrollAnimations();
});

// Slider functionality
function initializeSlider() {
  startAutoSlide();

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      goToSlide(index);
      resetAutoSlide();
    });
  });

  // Get slider container
  const sliderContainer = document.querySelector(".slider-container");
  if (!sliderContainer) {
    console.log("Slider container not found!");
    return;
  }

  let isDragging = false;
  let startX = 0;
  let mobileStartX = 0;
  let mobileEndX = 0;

  // MOBILE TOUCH EVENTS
  sliderContainer.addEventListener(
    "touchstart",
    (e) => {
      mobileStartX = e.touches[0].clientX;
      console.log("Touch start:", mobileStartX); // Debug log
    },
    { passive: true }
  );

  sliderContainer.addEventListener(
    "touchend",
    (e) => {
      mobileEndX = e.changedTouches[0].clientX;
      console.log("Touch end:", mobileEndX); // Debug log

      const diff = mobileStartX - mobileEndX;
      const swipeThreshold = 50;

      console.log("Swipe difference:", diff); // Debug log

      if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
          // Swipe left - next slide
          console.log("Next slide");
          nextSlide();
          resetAutoSlide();
        } else {
          // Swipe right - previous slide
          console.log("Previous slide");
          const prevIndex =
            currentSlide === 0 ? slides.length - 1 : currentSlide - 1;
          goToSlide(prevIndex);
          resetAutoSlide();
        }
      }
    },
    { passive: true }
  );

  // PC MOUSE EVENTS
  sliderContainer.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX;
    sliderContainer.style.cursor = "grabbing";
    e.preventDefault();
  });

  sliderContainer.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    e.preventDefault();
  });

  sliderContainer.addEventListener("mouseup", (e) => {
    if (!isDragging) return;
    isDragging = false;
    sliderContainer.style.cursor = "grab";

    const endX = e.clientX;
    const diff = startX - endX;
    const swipeThreshold = 50;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        nextSlide();
        resetAutoSlide();
      } else {
        const prevIndex =
          currentSlide === 0 ? slides.length - 1 : currentSlide - 1;
        goToSlide(prevIndex);
        resetAutoSlide();
      }
    }
  });

  sliderContainer.addEventListener("mouseleave", () => {
    isDragging = false;
    sliderContainer.style.cursor = "grab";
  });

  // Set cursor style
  sliderContainer.style.cursor = "grab";
}

function goToSlide(slideIndex) {
  // Remove active class from current slide and dot
  slides[currentSlide].classList.remove("active");
  dots[currentSlide].classList.remove("active");

  // Add active class to new slide and dot
  currentSlide = slideIndex;
  slides[currentSlide].classList.add("active");
  dots[currentSlide].classList.add("active");
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
  menuToggle.addEventListener("click", openSidePanel);
  closePanel.addEventListener("click", closeSidePanel);
  overlay.addEventListener("click", closeSidePanel);

  // ADD THIS: New artwork details navigation
  const viewAllBtn = document.getElementById("viewAllArtworks");
  if (viewAllBtn) {
    viewAllBtn.addEventListener("click", function () {
      window.location.href = "artwork-details.html";
    });
  }

  // Artwork details navigation
  viewAllBtn.addEventListener("click", showArtworkDetails);
  backBtn.addEventListener("click", showMainContent);

  // Individual artwork items click handlers
  // setupArtworkItemClickHandlers();

  // QR page triggers
  setupQRPageTriggers();

  // Window resize handler
  window.addEventListener("resize", handleWindowResize);
}

function setupQRPageTriggers() {
  // Add QR trigger to search icon
  const searchIcon = document.querySelector(".search-icon");
  if (searchIcon) {
    searchIcon.addEventListener("click", showQRPage);
  }

  // Add long press detection for mobile QR trigger
  let pressTimer;
  document.addEventListener("touchstart", (e) => {
    if (e.target.closest(".artwork-item")) {
      pressTimer = setTimeout(() => {
        showQRPage();
      }, 1000);
    }
  });

  document.addEventListener("touchend", () => {
    clearTimeout(pressTimer);
  });
}

function openSidePanel() {
  sidePanel.classList.add("active");
  overlay.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeSidePanel() {
  sidePanel.classList.remove("active");
  overlay.classList.remove("active");
  document.body.style.overflow = "auto";
}

// Artwork slider functionality
// Replace the setupArtworkSlider function with this improved version
function setupArtworkSlider() {
  const artworksSlider = document.querySelector(".artworks-slider");
  if (!artworksSlider) return;

  const artworkItems = Array.from(
    artworksSlider.querySelectorAll(".artwork-item")
  );
  const itemWidth = 330; // 300px width + 30px gap
  const totalItems = artworkItems.length;

  // Clone items for infinite effect
  const clonedItems = artworkItems.map((item) => item.cloneNode(true));

  // Add cloned items to the end
  clonedItems.forEach((item) => artworksSlider.appendChild(item));

  // Add original items to the beginning (for left scroll)
  const startClones = artworkItems.map((item) => item.cloneNode(true));
  startClones
    .reverse()
    .forEach((item) =>
      artworksSlider.insertBefore(item, artworksSlider.firstChild)
    );

  // Set initial position to show original items
  artworksSlider.scrollLeft = totalItems * itemWidth;

  let isScrolling = false;
  let scrollTimeout;
  let isSnapping = false;

  // Improved scroll event handling
  artworksSlider.addEventListener("scroll", () => {
    if (isScrolling || isSnapping) return;

    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      handleInfiniteScroll();
    }, 150); // Increased timeout for smoother experience
  });

  function handleInfiniteScroll() {
    if (isSnapping) return;
    
    const scrollLeft = artworksSlider.scrollLeft;
    const maxScroll = artworksSlider.scrollWidth - artworksSlider.clientWidth;

    // If scrolled to the end (showing cloned items), jump to original position
    if (scrollLeft >= maxScroll - 5) {
      isScrolling = true;
      artworksSlider.style.scrollBehavior = "auto";
      artworksSlider.scrollLeft = totalItems * itemWidth;
      setTimeout(() => {
        isScrolling = false;
        artworksSlider.style.scrollBehavior = "smooth";
      }, 10);
    }
    // If scrolled to the beginning (showing start clones), jump to end of originals
    else if (scrollLeft <= 5) {
      isScrolling = true;
      artworksSlider.style.scrollBehavior = "auto";
      artworksSlider.scrollLeft = totalItems * itemWidth;
      setTimeout(() => {
        isScrolling = false;
        artworksSlider.style.scrollBehavior = "smooth";
      }, 10);
    }
  }

  // Improved snapping function
  function snapToNearestItem() {
    if (isScrolling || isSnapping) return;

    isSnapping = true;
    const scrollLeft = artworksSlider.scrollLeft;
    const nearestItemIndex = Math.round(scrollLeft / itemWidth);
    const targetScrollLeft = nearestItemIndex * itemWidth;

    // Only snap if we're not already close enough
    if (Math.abs(scrollLeft - targetScrollLeft) > 10) {
      artworksSlider.scrollTo({
        left: targetScrollLeft,
        behavior: "smooth",
      });
      
      // Wait for snap animation to complete
      setTimeout(() => {
        isSnapping = false;
      }, 300);
    } else {
      isSnapping = false;
    }
  }

  // Improved mouse drag functionality
  let isDown = false;
  let startX;
  let scrollLeftStart;
  let hasMoved = false;

  artworksSlider.addEventListener("mousedown", (e) => {
    isDown = true;
    hasMoved = false;
    isSnapping = false; // Stop any ongoing snapping
    artworksSlider.style.cursor = "grabbing";
    artworksSlider.style.scrollBehavior = "auto";
    startX = e.pageX - artworksSlider.offsetLeft;
    scrollLeftStart = artworksSlider.scrollLeft;
    e.preventDefault();
  });

  artworksSlider.addEventListener("mouseleave", () => {
    if (isDown) {
      isDown = false;
      artworksSlider.style.cursor = "grab";
      artworksSlider.style.scrollBehavior = "smooth";
      if (hasMoved) {
        setTimeout(() => {
          snapToNearestItem();
          setTimeout(handleInfiniteScroll, 400);
        }, 100);
      }
    }
  });

  artworksSlider.addEventListener("mouseup", () => {
    if (isDown) {
      isDown = false;
      artworksSlider.style.cursor = "grab";
      artworksSlider.style.scrollBehavior = "smooth";
      if (hasMoved) {
        setTimeout(() => {
          snapToNearestItem();
          setTimeout(handleInfiniteScroll, 400);
        }, 100);
      }
    }
  });

  artworksSlider.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    e.preventDefault();
    hasMoved = true;
    const x = e.pageX - artworksSlider.offsetLeft;
    const walk = (x - startX) * 0.8; // Reduced multiplier for smoother drag
    artworksSlider.scrollLeft = scrollLeftStart - walk;
  });

  // Improved touch events for mobile
  let touchStartX = 0;
  let touchScrollStart = 0;
  let touchHasMoved = false;

  artworksSlider.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.touches[0].pageX;
      touchScrollStart = artworksSlider.scrollLeft;
      touchHasMoved = false;
      isSnapping = false; // Stop any ongoing snapping
      artworksSlider.style.scrollBehavior = "auto";
    },
    { passive: true }
  );

  artworksSlider.addEventListener(
    "touchmove",
    (e) => {
      if (!touchStartX) return;
      touchHasMoved = true;
      const x = e.touches[0].pageX;
      const walk = (touchStartX - x) * 1.0; // Reduced multiplier for smoother touch
      artworksSlider.scrollLeft = touchScrollStart + walk;
    },
    { passive: true }
  );

  artworksSlider.addEventListener(
    "touchend",
    () => {
      touchStartX = 0;
      artworksSlider.style.scrollBehavior = "smooth";
      if (touchHasMoved) {
        setTimeout(() => {
          snapToNearestItem();
          setTimeout(handleInfiniteScroll, 400);
        }, 150);
      }
    },
    { passive: true }
  );

  // Improved keyboard navigation
  artworksSlider.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      isSnapping = false;
      const currentScroll = artworksSlider.scrollLeft;
      artworksSlider.scrollTo({
        left: currentScroll - itemWidth,
        behavior: "smooth",
      });
      setTimeout(() => {
        handleInfiniteScroll();
      }, 400);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      isSnapping = false;
      const currentScroll = artworksSlider.scrollLeft;
      artworksSlider.scrollTo({
        left: currentScroll + itemWidth,
        behavior: "smooth",
      });
      setTimeout(() => {
        handleInfiniteScroll();
      }, 400);
    }
  });

  // Set initial styles
  artworksSlider.tabIndex = 0;
  artworksSlider.style.cursor = "grab";
  artworksSlider.style.outline = "none";
  artworksSlider.style.scrollBehavior = "smooth";
}

function showQRPage() {
  qrPage.classList.add("active");
  document.body.style.overflow = "hidden";

  // Add entrance animation
  const qrBackground = document.querySelector(".qr-background");
  if (qrBackground) {
    qrBackground.style.transform = "scale(0.8)";
    qrBackground.style.opacity = "0";
    setTimeout(() => {
      qrBackground.style.transition = "all 0.4s ease";
      qrBackground.style.transform = "scale(1)";
      qrBackground.style.opacity = "1";
    }, 50);
  }

  // Auto-hide QR page after 8 seconds
  setTimeout(() => {
    if (qrPage.classList.contains("active")) {
      hideQRPage();
    }
  }, 8000);
}

function hideQRPage() {
  const qrBackground = document.querySelector(".qr-background");
  if (qrBackground) {
    qrBackground.style.transform = "scale(0.8)";
    qrBackground.style.opacity = "0";
    setTimeout(() => {
      qrPage.classList.remove("active");
      document.body.style.overflow = "auto";
      qrBackground.style.transform = "scale(1)";
      qrBackground.style.opacity = "1";
    }, 300);
  } else {
    qrPage.classList.remove("active");
    document.body.style.overflow = "auto";
  }
}
// Scroll animations
function setupScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";
      }
    });
  }, observerOptions);

  // Observe artwork items for scroll animations
  document.querySelectorAll(".artwork-item").forEach((item, index) => {
    item.style.opacity = "0";
    item.style.transform = "translateY(30px)";
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

document.addEventListener("DOMContentLoaded", () => {
  setupArtworkSlider();
});

// Event listeners for clicks outside elements
document.addEventListener("click", (e) => {
  // Close QR page when clicking outside
  if (
    qrPage.classList.contains("active") &&
    !e.target.closest(".qr-background")
  ) {
    hideQRPage();
  }

  // Close search overlay when clicking outside
  const searchOverlay = document.querySelector(".search-overlay");
  if (
    searchOverlay &&
    searchOverlay.classList.contains("active") &&
    !e.target.closest(".search-container")
  ) {
    searchOverlay.classList.remove("active");
    document.body.style.overflow = "auto";
  }
});

// Keyboard navigation
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (sidePanel.classList.contains("active")) {
      closeSidePanel();
    } else if (qrPage.classList.contains("active")) {
      hideQRPage();
    } else if (document.querySelector(".search-overlay.active")) {
      document.querySelector(".search-overlay").classList.remove("active");
      document.body.style.overflow = "auto";
    }
  }

  // Arrow keys for slider - remove the artworkDetailsPage check
  if (e.key === "ArrowLeft") {
    const prevIndex = currentSlide === 0 ? slides.length - 1 : currentSlide - 1;
    goToSlide(prevIndex);
    resetAutoSlide();
  } else if (e.key === "ArrowRight") {
    const nextIndex = (currentSlide + 1) % slides.length;
    goToSlide(nextIndex);
    resetAutoSlide();
  }

  // Spacebar to pause/resume slider - remove the artworkDetailsPage check
  if (e.key === " ") {
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
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }

    // Close side panel if open
    closeSidePanel();
  });
});

// Performance optimization - pause animations when page is not visible
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clearInterval(slideInterval);
  } else {
    // Remove the artworkDetailsPage check
    startAutoSlide();
  }
});

// Add loading states and error handling
window.addEventListener("load", () => {
  // setupArtworkSlider();
  // Hide any loading indicators
  const loadingIndicators = document.querySelectorAll(".loading");
  loadingIndicators.forEach((indicator) => {
    indicator.style.display = "none";
  });

  // Add loaded class to body for CSS transitions
  document.body.classList.add("loaded");
});

// Error handling for images
document.querySelectorAll("img").forEach((img) => {
  img.addEventListener("error", function () {
    this.style.background = "#f0f0f0";
    this.style.display = "flex";
    this.style.alignItems = "center";
    this.style.justifyContent = "center";
    this.innerHTML = '<span style="color: #666;">Image not available</span>';
  });
});

function handleSwipe() {
  const swipeThreshold = 50;
  const diff = touchStartX - touchEndX;

  if (Math.abs(diff) > swipeThreshold) {
    // Remove the artworkDetailsPage check
    if (
      !sidePanel.classList.contains("active") &&
      !qrPage.classList.contains("active")
    ) {
      if (diff > 0) {
        // Swipe left - next slide
        nextSlide();
        resetAutoSlide();
      } else {
        // Swipe right - previous slide
        const prevIndex =
          currentSlide === 0 ? slides.length - 1 : currentSlide - 1;
        goToSlide(prevIndex);
        resetAutoSlide();
      }
    }
  }
}
