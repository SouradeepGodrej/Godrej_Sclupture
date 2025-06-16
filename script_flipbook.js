let originalUrl = window.location.href;
let currentBookId = null;
let pageUpdateInterval = null;
let isFlipbookOpen = false;
let lastKnownPage = null;
let bookSwitchTimeout = null;
let pageUpdateDebounce = null;
let flipbookInstances = {};
let bookPageStates = {}; // Store last known page for each book
let overlayMonitorInterval = null; // New: Monitor overlay visibility
let bookTotalPages = {}; // Store total pages for each book

function getUrlParameter(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
  var results = regex.exec(location.search);
  return results === null
    ? ""
    : decodeURIComponent(results[1].replace(/\+/g, " "));
}

// New function to get total pages for a book
function getTotalPagesForBook(bookId) {
  // Try to get from stored value first
  if (bookTotalPages[bookId]) {
    return bookTotalPages[bookId];
  }

  // Try to get from FLIPBOOK global object
  if (
    typeof FLIPBOOK !== "undefined" &&
    FLIPBOOK.books &&
    FLIPBOOK.books[bookId - 1]
  ) {
    const book = FLIPBOOK.books[bookId - 1];
    if (book.numPages !== undefined) {
      bookTotalPages[bookId] = book.numPages;
      return book.numPages;
    }
  }

  // Try to get from flipbook instance
  if (flipbookInstances[bookId]) {
    const instance = flipbookInstances[bookId];
    if (
      instance[0] &&
      instance[0].flipBook &&
      instance[0].flipBook.numPages !== undefined
    ) {
      bookTotalPages[bookId] = instance[0].flipBook.numPages;
      return instance[0].flipBook.numPages;
    }
  }

  // Try to get from DOM
  const visibleOverlay = $(".flipbook-overlay:visible");
  if (visibleOverlay.length > 0) {
    const pageDisplay = visibleOverlay.find(".flipbook-currentPageNumber");
    if (pageDisplay.length > 0 && pageDisplay.is(":visible")) {
      const pageText = pageDisplay.text().trim();
      const match = pageText.match(/\d+\s*\/\s*(\d+)/);
      if (match) {
        const totalPages = parseInt(match[1]);
        bookTotalPages[bookId] = totalPages;
        return totalPages;
      }
    }
  }

  // Default fallback
  return null;
}

// New function to format page parameter with ranges and total
function formatPageParameter(currentPage, totalPages) {
  if (!currentPage || !totalPages) {
    return null;
  }

  // First page (always single)
  if (currentPage === 1) {
    return `1/${totalPages}`;
  }

  // Last page (single if total is even, or if it's the actual last page)
  if (currentPage === totalPages) {
    return `${totalPages}/${totalPages}`;
  }

  // For pages in between, determine if it's a spread
  if (currentPage > 1 && currentPage < totalPages) {
    // If current page is even, it's likely the left page of a spread
    if (currentPage % 2 === 0) {
      // Show as spread: currentPage-(currentPage+1)
      const nextPage = Math.min(currentPage + 1, totalPages);
      if (nextPage <= totalPages && nextPage !== currentPage) {
        return `${currentPage}-${nextPage}/${totalPages}`;
      }
    } else {
      // If current page is odd and greater than 1, it might be the right page of a spread
      // Show as spread: (currentPage-1)-currentPage
      const prevPage = currentPage - 1;
      if (prevPage >= 2) {
        return `${prevPage}-${currentPage}/${totalPages}`;
      }
    }
  }

  // Fallback to single page format
  return `${currentPage}/${totalPages}`;
}

function updateUrl(bookId, page, force = false) {
  // Only update if this is still the current book or forced
  if (!force && bookId !== currentBookId) {
    // console.log( "🚫 Ignoring URL update for inactive book:", bookId, "current:", currentBookId );
    return;
  }

  const url = new URL(window.location);
  url.searchParams.set("book", bookId);

  if (page && page > 0) {
    const totalPages = getTotalPagesForBook(bookId);
    const pageParam = formatPageParameter(page, totalPages);

    if (pageParam) {
      // Set the page parameter without encoding the forward slash
      url.searchParams.set("page", pageParam);
      // Replace the encoded slash back to normal slash
      const urlString = url.toString().replace(/%2F/g, "/");
      window.history.pushState({}, "", urlString);
      // console.log("✅ URL updated:", urlString);
      return; // Exit early since we already updated the URL
    } else {
      // Fallback to simple page number if we can't determine total pages
      url.searchParams.set("page", page);
    }

    // Store the page state for this book
    bookPageStates[bookId] = page;
  } else {
    url.searchParams.delete("page");
  }

  window.history.pushState({}, "", url);
  // console.log("✅ URL updated:", url.toString());
}

function restoreOriginalUrl() {
  // Only restore if we're actually showing a book URL
  if (window.location.href !== originalUrl) {
    window.history.pushState({}, "", originalUrl);
    // console.log("🔄 URL restored to original");
  }
  stopPageMonitoring();
  stopOverlayMonitoring(); // Stop overlay monitoring
}

function stopPageMonitoring() {
  // console.log("🛑 Stopping ALL page monitoring for book:", currentBookId);

  // Clear interval
  if (pageUpdateInterval) {
    clearInterval(pageUpdateInterval);
    pageUpdateInterval = null;
  }

  // Clear all timeouts
  if (bookSwitchTimeout) {
    clearTimeout(bookSwitchTimeout);
    bookSwitchTimeout = null;
  }

  if (pageUpdateDebounce) {
    clearTimeout(pageUpdateDebounce);
    pageUpdateDebounce = null;
  }

  // Remove manual event listeners with namespace
  $(document).off("click.pageMonitoring");

  // Clear any pending page update timeouts
  if (window.pageUpdateTimeout) {
    clearTimeout(window.pageUpdateTimeout);
    window.pageUpdateTimeout = null;
  }

  // Reset state but keep flipbook instances and page states
  currentBookId = null;
  isFlipbookOpen = false;
  lastKnownPage = null;
}

// New function to check if any flipbook overlay is visible
function isAnyFlipbookVisible() {
  const overlays = $(".flipbook-overlay");
  let hasVisible = false;

  overlays.each(function () {
    const $overlay = $(this);
    const display = $overlay.css("display");
    const isVisible = display !== "none" && $overlay.is(":visible");

    if (isVisible) {
      hasVisible = true;
      // console.log("📖 Found visible overlay:", $overlay[0]);
      return false; // Break the loop
    }
  });

  // console.log( "👁️ Any flipbook visible?", hasVisible, "Total overlays:", overlays.length );
  return hasVisible;
}

// New function to start monitoring overlay visibility
function startOverlayMonitoring() {
  if (overlayMonitorInterval) {
    clearInterval(overlayMonitorInterval);
  }

  // console.log("👁️ Starting overlay visibility monitoring");

  overlayMonitorInterval = setInterval(() => {
    const anyVisible = isAnyFlipbookVisible();

    if (!anyVisible && (isFlipbookOpen || currentBookId)) {
      // console.log("👁️ No visible overlays detected - closing flipbook");
      isFlipbookOpen = false;
      restoreOriginalUrl();
    } else if (anyVisible && !isFlipbookOpen) {
      // console.log("👁️ Visible overlay detected - flipbook opened");
      isFlipbookOpen = true;
    }
  }, 300); // Check every 300ms
}

// New function to stop overlay monitoring
function stopOverlayMonitoring() {
  if (overlayMonitorInterval) {
    clearInterval(overlayMonitorInterval);
    overlayMonitorInterval = null;
    // console.log("👁️ Stopped overlay monitoring");
  }
}

function getCurrentPageFromFlipbook(bookId) {
  let currentPage = null;

  // Method 1: Check FLIPBOOK global object
  if (
    typeof FLIPBOOK !== "undefined" &&
    FLIPBOOK.books &&
    FLIPBOOK.books[bookId - 1]
  ) {
    const book = FLIPBOOK.books[bookId - 1];
    if (book.currentPage !== undefined) {
      currentPage = book.currentPage;
      console.log("📖 Got page from FLIPBOOK.books:", currentPage);
    }
  }

  // Method 2: Check flipbook instance
  if (!currentPage && flipbookInstances[bookId]) {
    const instance = flipbookInstances[bookId];
    if (
      instance[0] &&
      instance[0].flipBook &&
      instance[0].flipBook.currentPage !== undefined
    ) {
      currentPage = instance[0].flipBook.currentPage;
      console.log("📖 Got page from instance:", currentPage);
    }
  }

  // Method 3: Check DOM element - BUT ONLY for the currently active book
  if (!currentPage && isFlipbookOpen && bookId === currentBookId) {
    // Find the visible flipbook overlay
    const visibleOverlay = $(".flipbook-overlay:visible");
    if (visibleOverlay.length > 0) {
      const pageDisplay = visibleOverlay.find(".flipbook-currentPageNumber");
      if (pageDisplay.length > 0 && pageDisplay.is(":visible")) {
        const pageText = pageDisplay.text().trim();
        const match = pageText.match(/(\d+)/);
        if (match) {
          currentPage = parseInt(match[1]);
          console.log("📖 Got page from visible DOM:", currentPage);
        }
      }
    }
  }

  // Method 4: Fallback to stored page state
  if (!currentPage && bookPageStates[bookId]) {
    currentPage = bookPageStates[bookId];
    console.log("📖 Got page from stored state:", currentPage);
  }

  return currentPage;
}

// New function to parse page parameter from URL (handles both old and new formats)
function parsePageFromUrl(pageParam) {
  if (!pageParam) return null;

  // Handle new format: "1/8", "2-3/8", etc.
  const rangeMatch = pageParam.match(/^(\d+)(?:-(\d+))?\/(\d+)$/);
  if (rangeMatch) {
    // For range format, return the first page number
    return parseInt(rangeMatch[1]);
  }

  // Handle range format without total: "2-3"
  const rangeOnlyMatch = pageParam.match(/^(\d+)-(\d+)$/);
  if (rangeOnlyMatch) {
    return parseInt(rangeOnlyMatch[1]);
  }

  // Handle old format: just a number
  const simpleMatch = pageParam.match(/^(\d+)$/);
  if (simpleMatch) {
    return parseInt(simpleMatch[1]);
  }

  return null;
}

function switchToBook(bookId) {
  console.log("📚 Switching to book:", bookId, "from:", currentBookId);

  // COMPLETELY stop all monitoring first
  stopPageMonitoring();
  stopOverlayMonitoring();

  // Force clear any remaining intervals or timeouts
  setTimeout(() => {
    // Set new book state
    currentBookId = bookId;
    isFlipbookOpen = true;

    // Get current page - prefer stored state for this book, then try to detect
    let initialPage =
      bookPageStates[bookId] || getCurrentPageFromFlipbook(bookId) || 1;
    lastKnownPage = initialPage;

    // Update URL immediately
    updateUrl(bookId, initialPage, true);

    // Update download URL for current book
    const bookDownloadUrls = {
      1: "Pdf-Flipbook-master-main/images/art-at-trees.rar",
      2: "Pdf-Flipbook-master-main/images/first-107pg.rar", 
      3: "Pdf-Flipbook-master-main/images/second-3pg.rar",
      4: "Pdf-Flipbook-master-main/images/third-8pg.rar"
    };

    const bookNames = {
      1: "art-at-trees.rar",
      2: "first-107pg.rar", 
      3: "second-3pg.rar",
      4: "third-8pg.rar"
    };

    const downloadUrl = bookDownloadUrls[bookId] || "Pdf-Flipbook-master-main/images/pdf.rar";
    const downloadName = bookNames[bookId] || "allPages.rar";

    // Update the download button URL if flipbook instance exists
    setTimeout(() => {
      if (flipbookInstances[bookId] && flipbookInstances[bookId][0] && flipbookInstances[bookId][0].flipBook) {
        const flipbook = flipbookInstances[bookId][0].flipBook;
        if (flipbook.options && flipbook.options.btnDownloadPages) {
          flipbook.options.btnDownloadPages.url = downloadUrl;
          flipbook.options.btnDownloadPages.name = downloadName;
          console.log("📥 Download URL updated for book:", bookId, "->", downloadUrl);
        }
      }
    }, 200);

    console.log("✅ Book switched to:", bookId, "initial page:", initialPage);

    // Start both monitoring systems after flipbook settles
    setTimeout(() => {
      if (currentBookId === bookId && isFlipbookOpen) {
        startPageMonitoring();
        startOverlayMonitoring(); // Start overlay monitoring
        console.log("✅ Fresh monitoring started for book:", bookId);
      }
    }, 500);
  }, 100);
}

function updatePageWithDebounce(bookId, page) {
  // Clear any pending updates
  if (pageUpdateDebounce) {
    clearTimeout(pageUpdateDebounce);
    pageUpdateDebounce = null;
  }

  // Only update if this is the current book
  if (bookId !== currentBookId) {
    // console.log( "🚫 Ignoring page update for inactive book:", bookId, "current:", currentBookId );
    return;
  }

  // Always update if page is different
  if (page && page !== lastKnownPage && bookId === currentBookId) {
    // Immediate update for any page change
    // console.log("📄 Page update:", lastKnownPage, "->", page, "for book:",bookId );
    lastKnownPage = page;
    bookPageStates[bookId] = page; // Store the page state
    updateUrl(bookId, page);
  }
}

function startPageMonitoring() {
  if (!currentBookId || pageUpdateInterval) {
    // console.log("🚫 Cannot start monitoring - no book ID or interval exists");
    return;
  }

  // console.log("🔍 Starting page monitoring for book:", currentBookId);
  const monitoringBookId = currentBookId;

  pageUpdateInterval = setInterval(function () {
    // Only monitor if this is still the active book and flipbook is open
    if (!isFlipbookOpen || monitoringBookId !== currentBookId) {
      // console.log("🚫 Monitoring stopped - book changed or closed");
      clearInterval(pageUpdateInterval);
      pageUpdateInterval = null;
      return;
    }

    // Get current page using enhanced method
    let currentPage = getCurrentPageFromFlipbook(monitoringBookId);

    // Update page if found and valid
    if (currentPage && currentPage > 0 && currentPage !== lastKnownPage) {
      // console.log( "🔍 Page monitoring detected change:", lastKnownPage, "->", currentPage, "for book:", monitoringBookId);
      updatePageWithDebounce(monitoringBookId, currentPage);
    }
  }, 200);
}
// Add this function to update the input field
function updatePageInputField(pageValue) {
  // Find the page input field in the visible flipbook overlay
  const pageInput = $(".flipbook-overlay:visible .flipbook-currentPageInput");
  if (pageInput.length > 0) {
    // console.log("📝 Updating input field with:", pageValue);
    pageInput.val(pageValue);
  } else {
    // console.log("⚠️ Page input field not found");
  }
}

function setupFlipbookHooks() {
  const checkFlipbook = setInterval(() => {
    if (typeof FLIPBOOK !== "undefined") {
      clearInterval(checkFlipbook);
      // console.log("🔗 FLIPBOOK object found, setting up hooks");

      // Enhanced onPageLinkClick with proper page tracking
      if (FLIPBOOK.onPageLinkClick) {
        const originalOnPageLinkClick = FLIPBOOK.onPageLinkClick;
        FLIPBOOK.onPageLinkClick = function (e) {
          // console.log("🔗 Page link clicked:", e.dataset);

          const bookId = parseInt(e.dataset.bookid);
          const page = parseInt(e.dataset.page);

          // Call original function
          const result = originalOnPageLinkClick.apply(this, arguments);

          // Update our tracking
          if (bookId && page && bookId === currentBookId) {
            setTimeout(() => {
              if (currentBookId === bookId) {
                // console.log("🔗 Updating URL from page link:", page);
                lastKnownPage = page;
                bookPageStates[bookId] = page;
                updateUrl(bookId, page);
              }
            }, 100);
          }

          return result;
        };
      }
    }
  }, 100);

  setTimeout(() => clearInterval(checkFlipbook), 10000);
}

function autoOpenFromUrl() {
  const bookId = getUrlParameter("book");
  const pageParam = getUrlParameter("page");

  if (bookId) {
    const bookElement = $(`.book-${bookId}`);
    if (bookElement.length) {
      console.log("🎯 Auto-opening book:", bookId, "page param:", pageParam);

      // Parse the page number from the parameter (handles both old and new formats)
      const pageNum = parsePageFromUrl(pageParam);

      // Store the page state if provided
      if (pageNum) {
        bookPageStates[parseInt(bookId)] = pageNum;
      }

      // Use switchToBook to properly handle the transition
      switchToBook(parseInt(bookId));

      // Trigger click to open the book
      setTimeout(() => {
        bookElement.find("a").click();

        // Navigate to specific page if provided
        // Navigate to specific page if provided
        if (pageNum) {
          // DISABLE URL updates while navigating to target page
          const originalBookId = currentBookId;
          currentBookId = null; // Temporarily disable updates

          setTimeout(() => {
            const targetPage = pageNum;
            const bookIndex = parseInt(bookId) - 1;

            // console.log( "📍 Navigating to page:", targetPage, "for book index:", bookIndex);

            // Wait for flipbook to be fully loaded before navigating
            const waitForFlipbook = setInterval(() => {
              let navigated = false;

              // Method 1: FLIPBOOK global object
              if (
                typeof FLIPBOOK !== "undefined" &&
                FLIPBOOK.books &&
                FLIPBOOK.books[bookIndex]
              ) {
                FLIPBOOK.books[bookIndex].goToPage(targetPage);
                navigated = true;
                // console.log( "✅ Navigated via FLIPBOOK.books to page:", targetPage );
                clearInterval(waitForFlipbook);
              }

              // Method 2: Flipbook instance
              if (!navigated && flipbookInstances[parseInt(bookId)]) {
                const instance = flipbookInstances[parseInt(bookId)];
                if (instance[0] && instance[0].flipBook) {
                  instance[0].flipBook.goToPage(targetPage);
                  navigated = true;
                  // console.log("✅ Navigated via instance to page:", targetPage);
                  clearInterval(waitForFlipbook);
                }
              }

              if (navigated) {
                // RE-ENABLE URL updates after navigation
                currentBookId = originalBookId;
                lastKnownPage = targetPage;
                bookPageStates[parseInt(bookId)] = targetPage;

                // Update the input field with the correct page range
                const totalPages = getTotalPagesForBook(parseInt(bookId));
                const pageParam = formatPageParameter(targetPage, totalPages);
                if (pageParam) {
                  updatePageInputField(pageParam.split("/")[0]); // This will set "2-3" in the input
                }

                // console.log("✅ Navigation complete, URL updates re-enabled");
              }
            }, 500);

            setTimeout(() => clearInterval(waitForFlipbook), 10000);
          }, 1000);
        }
      }, 500);
    }
  }
}

// Document ready function
$(document).ready(function () {
  setupFlipbookHooks();
  const bookConfigs = {
    ".book-1": {
      pdfUrl: "Pdf-Flipbook-master-main/pdf/Art at the trees-2.pdf",
    },
    ".book-2": {
      pdfUrl: "",
    },
  };
  const commonConfig = {
    lightBox: true,
    layout: 3,
    currentPage: { vAlign: "bottom", hAlign: "left" },
    btnShare: { enabled: false },
    btnPrint: { hideOnMobile: true },
    btnDownloadPages: {
      enabled: true,
      title: "Download pages",
      icon: "fa-download",
      icon2: "file_download",
      url: "Pdf-Flipbook-master-main/pdf/Art at the trees-2.zip",
      name: "allPages.zip",
      hideOnMobile: false,
    },
    btnColor: "rgb(128,128,128)",
    sideBtnColor: "rgb(128,128,128)",
    sideBtnSize: 60,
    sideBtnBackground: "rgba(0,0,0,.7)",
    sideBtnRadius: 60,
    btnSound: { vAlign: "top", hAlign: "left" },
    btnAutoplay: { vAlign: "top", hAlign: "left" },
    btnShare: {
      enabled: true,
      title: "Share",
      icon: "fa-share-alt",
    },
    facebook: { enabled: true, url: "facebook.com" },
    google_plus: { enabled: true, url: "google.com" },
    email: {
      enabled: true,
      url: "email.com",
      title: "PDF KPK",
      description: "email.com",
    },
    twitter: { enabled: true, url: "twitter.com" },
    pinterest: { enabled: true, url: "pinsterest.com" },

    // Enhanced callbacks
    onShow: function () {
      console.log("📖 Book shown via callback");
      isFlipbookOpen = true;
      // Start overlay monitoring when book shows
      startOverlayMonitoring();
    },

    onHide: function () {
      console.log("📖 Book hidden via callback");
      isFlipbookOpen = false;
      restoreOriginalUrl();
    },
  };

  Object.keys(bookConfigs).forEach((selector, index) => {
    const bookId = index + 1;
    const config = {
      ...commonConfig,
      ...bookConfigs[selector],
      bookId: bookId,
    };
    const instance = $(selector).flipBook(config);
    flipbookInstances[bookId] = instance;

    setTimeout(() => {
      if (instance[0] && instance[0].flipBook) {
        // Store original onPageChange if it exists
        const originalOnPageChange = instance[0].flipBook.onPageChange;

        instance[0].flipBook.onPageChange = function (page) {
          // console.log( "📄 FlipBook onPageChange:", page, "for book:", bookId, "current book:", currentBookId );
          // Call original callback if it exists
          if (
            originalOnPageChange &&
            typeof originalOnPageChange === "function"
          ) {
            originalOnPageChange.call(this, page);
          }

          // Update URL if this is the current book
          if (
            bookId === currentBookId &&
            isFlipbookOpen &&
            page !== lastKnownPage
          ) {
            updatePageWithDebounce(bookId, page);
          }
        };
      }
    }, 500);
  });

  // Store flipbook instances globally
  window.flipbookInstances = flipbookInstances;

  // Enhanced click handlers
  $(".book-1 a").click(function (e) {
    // console.log("🖱️ Book 1 clicked");
    switchToBook(1);
  });
  $(".book-2 a").click(function (e) {
    // console.log("🖱️ Book 2 clicked");
    switchToBook(2);
  });

  // Enhanced close handlers - check if any book is actually open
  $(document).on(
    "click",
    ".flipbook-close-btn, .flipbook-overlay .close, .flipbook-btnClose",
    function () {
      // console.log("❌ Close button clicked");
      // Only restore URL if we're actually showing a flipbook
      if (isFlipbookOpen || currentBookId) {
        restoreOriginalUrl();
      }
    }
  );

  // Enhanced navigation click handler
  $(document).on(
    "click.pageMonitoring",
    ".flipbook-nav, .flipbook-btn, .flipbook-page",
    function () {
      if (currentBookId && isFlipbookOpen) {
        setTimeout(() => {
          // Get current page using enhanced method
          const newPage = getCurrentPageFromFlipbook(currentBookId);
          if (newPage && newPage !== lastKnownPage) {
            // console.log( "📄 Manual navigation detected:", newPage, "for book:", currentBookId);
            updatePageWithDebounce(currentBookId, newPage);
          }
        }, 200);
      }
    }
  );

  // ESC key handler
  $(document).keyup(function (e) {
    if (e.keyCode == 27 && isFlipbookOpen) {
      // console.log("⌨️ ESC key pressed");
      restoreOriginalUrl();
    }
  });

  $(document).on(
    "change keypress",
    '.flipbook-overlay input[type="text"]',
    function (e) {
      if (e.type === "keypress" && e.which !== 13) return; // Only proceed on Enter key or change event

      const inputValue = $(this).val().trim();
      const pageNum = parsePageFromUrl(inputValue); // This will now handle "2-3" format

      if (pageNum && currentBookId) {
        // Navigate to the page
        const bookIndex = currentBookId - 1;
        if (
          typeof FLIPBOOK !== "undefined" &&
          FLIPBOOK.books &&
          FLIPBOOK.books[bookIndex]
        ) {
          FLIPBOOK.books[bookIndex].goToPage(pageNum);
        }
      }
    }
  );

  // Enhanced MutationObserver to watch for overlay changes
  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.type === "childList") {
        mutation.removedNodes.forEach(function (node) {
          if (
            node.nodeType === 1 &&
            node.classList &&
            node.classList.contains("flipbook-lightbox")
          ) {
            // console.log("🗑️ Flipbook lightbox removed");
            isFlipbookOpen = false;
            // Only restore URL if we actually had a book open
            if (currentBookId) {
              restoreOriginalUrl();
            }
          }
        });
      }

      // Watch for style attribute changes on flipbook overlays
      if (
        mutation.type === "attributes" &&
        mutation.attributeName === "style"
      ) {
        const target = mutation.target;
        if (target.classList && target.classList.contains("flipbook-overlay")) {
          const display = target.style.display;
          // console.log("👁️ Overlay style changed:", display, target);

          // Trigger a check after a short delay to allow for multiple changes
          setTimeout(() => {
            const anyVisible = isAnyFlipbookVisible();
            if (!anyVisible && (isFlipbookOpen || currentBookId)) {
              // console.log("👁️ All overlays hidden - closing flipbook");
              isFlipbookOpen = false;
              restoreOriginalUrl();
            }
          }, 100);
        }
      }
    });
  });

  // Observe both child changes and attribute changes
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style"],
  });

  // Auto-open book if URL parameters are present
  setTimeout(autoOpenFromUrl, 500);
});

// Enhanced debug functions
window.debugFlipbook = function () {
  console.log("Current state:", {
    currentBookId,
    isFlipbookOpen,
    lastKnownPage,
    bookPageStates,
    bookTotalPages,
    hasInterval: !!pageUpdateInterval,
    hasOverlayMonitor: !!overlayMonitorInterval,
    hasDebounce: !!pageUpdateDebounce,
    flipbookExists: typeof FLIPBOOK !== "undefined",
    flipbookBooks: typeof FLIPBOOK !== "undefined" ? FLIPBOOK.books : null,
    instances: Object.keys(flipbookInstances),
    currentUrl: window.location.href,
    originalUrl: originalUrl,
    anyVisible: isAnyFlipbookVisible,
  });

  // Check current page from all sources
  if (currentBookId) {
    const totalPages = getTotalPagesForBook(currentBookId);
    const currentPage = getCurrentPageFromFlipbook(currentBookId);
    const pageParam = formatPageParameter(currentPage, totalPages);

    console.log("Page formatting info:", {
      currentPage,
      totalPages,
      formattedParam: pageParam,
      fromFunction: getCurrentPageFromFlipbook(currentBookId),
      fromLastKnown: lastKnownPage,
      fromStored: bookPageStates[currentBookId],
      fromDOM: $(
        ".flipbook-overlay:visible .flipbook-currentPageNumber"
      ).text(),
    });
  }
};

window.forceBookSwitch = function (bookId) {
  console.log("🔧 Force switching to book:", bookId);
  switchToBook(bookId);
};

window.forcePageUpdate = function (page) {
  if (currentBookId) {
    console.log("🔧 Force page update to:", page, "for book:", currentBookId);
    lastKnownPage = page;
    bookPageStates[currentBookId] = page;
    updateUrl(currentBookId, page);
  }
};

window.clearBookStates = function () {
  console.log("🧹 Clearing all book page states");
  bookPageStates = {};
  bookTotalPages = {};
};

// New debug function to check overlay visibility
window.checkOverlays = function () {
  const overlays = $(".flipbook-overlay");
  console.log("Overlay visibility check:");
  overlays.each(function (index) {
    const $overlay = $(this);
    console.log(`Overlay ${index}:`, {
      display: $overlay.css("display"),
      visible: $overlay.is(":visible"),
      inlineStyle: $overlay.attr("style"),
    });
  });
  return isAnyFlipbookVisible();
};

// New debug function to test page formatting
window.testPageFormatting = function (page, total) {
  const result = formatPageParameter(page, total);
  // console.log(`Page ${page} of ${total} formats to: ${result}`);
  return result;
};
