(function() {
  'use strict';

  // Initialize wishlist page
  function initWishlistPage() {
    const wishlistPage = document.querySelector('[data-wishlist-page]');
    if (!wishlistPage) return;

    const wishlistGrid = wishlistPage.querySelector('[data-wishlist-grid]');
    const emptyMessage = wishlistPage.querySelector('[data-wishlist-empty]');
    const clearButton = wishlistPage.querySelector('[data-clear-wishlist]');

    // Load and display wishlist items
    function loadWishlistItems() {
      if (!window.Wishlist) {
        console.error('Wishlist utility not loaded');
        return;
      }

      const items = window.Wishlist.getAll();
      
      if (items.length === 0) {
        if (wishlistGrid) wishlistGrid.style.display = 'none';
        if (emptyMessage) emptyMessage.style.display = 'block';
        if (clearButton) clearButton.style.display = 'none';
        return;
      }

      if (wishlistGrid) wishlistGrid.style.display = 'grid';
      if (emptyMessage) emptyMessage.style.display = 'none';
      if (clearButton) clearButton.style.display = 'block';

      // Clear existing content
      if (wishlistGrid) {
        wishlistGrid.innerHTML = '';
      }

      // Render each wishlist item
      items.forEach(function(item) {
        renderWishlistItem(item, wishlistGrid);
      });

      // Update grid columns based on settings
      updateGridColumns();
    }

    // Render a single wishlist item
    function renderWishlistItem(item, container) {
      if (!container) return;

      const itemElement = document.createElement('div');
      itemElement.className = 'wishlist-item';
      itemElement.dataset.productId = item.productId;
      itemElement.dataset.variantId = item.variantId;

      // Format price
      const price = parseInt(item.price, 10);
      const formattedPrice = formatMoney(price);

      itemElement.innerHTML = `
        <div class="wishlist-item__image">
          <a href="${item.url || '#'}">
            ${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.title)}" loading="lazy">` : '<div class="wishlist-item__placeholder">No Image</div>'}
          </a>
          <button 
            type="button" 
            class="wishlist-item__remove" 
            data-remove-item
            aria-label="Remove from wishlist"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="wishlist-item__content">
          <h3 class="wishlist-item__title">
            <a href="${item.url || '#'}">${escapeHtml(item.title)}</a>
          </h3>
          <div class="wishlist-item__price">
            <span class="money">${formattedPrice}</span>
          </div>
        </div>
      `;

      // Add remove button event listener
      const removeButton = itemElement.querySelector('[data-remove-item]');
      if (removeButton) {
        removeButton.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          removeWishlistItem(item.productId, item.variantId);
        });
      }

      container.appendChild(itemElement);
    }

    // Remove item from wishlist
    function removeWishlistItem(productId, variantId) {
      if (!window.Wishlist) return;

      if (window.Wishlist.remove(productId, variantId)) {
        // Remove from DOM
        const itemElement = document.querySelector(`.wishlist-item[data-product-id="${productId}"][data-variant-id="${variantId}"]`);
        if (itemElement) {
          itemElement.remove();
        }

        // Reload wishlist to update UI
        loadWishlistItems();

        // Dispatch event
        document.dispatchEvent(new CustomEvent('wishlist:removed', {
          detail: { productId: productId, variantId: variantId }
        }));
      }
    }

    // Clear all wishlist items
    function clearWishlist() {
      if (!window.Wishlist) return;

      if (confirm('Are you sure you want to clear all items from your wishlist?')) {
        window.Wishlist.clear();
        loadWishlistItems();

        // Dispatch event
        document.dispatchEvent(new CustomEvent('wishlist:cleared'));
      }
    }

    // Format money using Shopify format or fallback
    function formatMoney(cents) {
      if (typeof window.Shopify !== 'undefined' && window.Shopify.formatMoney) {
        return window.Shopify.formatMoney(cents);
      }
      
      // Try to use theme's formatMoney if available
      if (typeof window.theme !== 'undefined' && window.theme.formatMoney) {
        return window.theme.formatMoney(cents);
      }
      
      // Fallback formatting
      const amount = (cents / 100).toFixed(2);
      const moneyFormat = typeof window.Shopify !== 'undefined' && window.Shopify.money_format 
        ? window.Shopify.money_format 
        : '${{amount}}';
      
      return moneyFormat.replace('{{amount}}', amount);
    }

    // Escape HTML
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Update grid columns based on responsive settings
    function updateGridColumns() {
      if (!wishlistGrid) return;
      
      const desktop = parseInt(wishlistPage.dataset.productsPerRowDesktop) || 4;
      const tablet = parseInt(wishlistPage.dataset.productsPerRowTablet) || 3;
      const mobile = parseInt(wishlistPage.dataset.productsPerRowMobile) || 2;
      
      function updateGrid() {
        if (window.innerWidth >= 1025) {
          wishlistGrid.style.gridTemplateColumns = `repeat(${desktop}, 1fr)`;
        } else if (window.innerWidth >= 769) {
          wishlistGrid.style.gridTemplateColumns = `repeat(${tablet}, 1fr)`;
        } else {
          wishlistGrid.style.gridTemplateColumns = `repeat(${mobile}, 1fr)`;
        }
      }
      
      updateGrid();
      window.addEventListener('resize', updateGrid);
    }

    // Clear button event listener
    if (clearButton) {
      clearButton.addEventListener('click', function(e) {
        e.preventDefault();
        clearWishlist();
      });
    }

    // Load wishlist items on page load
    loadWishlistItems();

    // Listen for wishlist updates from other pages
    window.addEventListener('storage', function(e) {
      if (e.key === 'shopify_wishlist') {
        loadWishlistItems();
      }
    });

    // Listen for custom events
    document.addEventListener('wishlist:added', function() {
      loadWishlistItems();
    });

    document.addEventListener('wishlist:removed', function() {
      loadWishlistItems();
    });
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWishlistPage);
  } else {
    initWishlistPage();
  }
})();
