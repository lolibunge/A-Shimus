(function() {
  'use strict';

  const WISHLIST_STORAGE_KEY = 'shopify_wishlist';
  const WISHLIST_PAGE_URL = '/pages/wishlist';

  // Wishlist utility functions
  const Wishlist = {
    // Get all wishlist items from localStorage
    getAll: function() {
      try {
        const wishlist = localStorage.getItem(WISHLIST_STORAGE_KEY);
        return wishlist ? JSON.parse(wishlist) : [];
      } catch (e) {
        console.error('Error reading wishlist:', e);
        return [];
      }
    },

    // Save wishlist to localStorage
    save: function(items) {
      try {
        localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
        return true;
      } catch (e) {
        console.error('Error saving wishlist:', e);
        return false;
      }
    },

    // Add item to wishlist
    add: function(item) {
      const wishlist = this.getAll();
      const existingIndex = wishlist.findIndex(function(wishlistItem) {
        return wishlistItem.productId === item.productId && 
               wishlistItem.variantId === item.variantId;
      });

      if (existingIndex === -1) {
        wishlist.push(item);
        this.save(wishlist);
        return true;
      }
      return false;
    },

    // Remove item from wishlist
    remove: function(productId, variantId) {
      const wishlist = this.getAll();
      const filtered = wishlist.filter(function(item) {
        return !(item.productId === productId && item.variantId === variantId);
      });
      this.save(filtered);
      return filtered.length < wishlist.length;
    },

    // Check if item is in wishlist
    has: function(productId, variantId) {
      const wishlist = this.getAll();
      return wishlist.some(function(item) {
        return item.productId === productId && item.variantId === variantId;
      });
    },

    // Clear all wishlist items
    clear: function() {
      localStorage.removeItem(WISHLIST_STORAGE_KEY);
    },

    // Get count of items
    count: function() {
      return this.getAll().length;
    }
  };
  
  // Initialize wishlist buttons on page load
  function initWishlistButtons() {
    const wishlistButtons = document.querySelectorAll('.btn-wishlist');
    wishlistButtons.forEach(function(button) {
      // Skip if button already has a wishlist listener
      if (button.dataset.wishlistInitialized === 'true') {
        // Still update the state in case wishlist changed
        const productId = button.dataset.productId;
        const variantId = button.dataset.productVariantId;
        if (productId && variantId) {
          if (Wishlist.has(productId, variantId)) {
            button.classList.add('favorite');
          } else {
            button.classList.remove('favorite');
          }
        }
        return;
      }
      
      // Mark as initialized
      button.dataset.wishlistInitialized = 'true';
      
      const productId = button.dataset.productId;
      const variantId = button.dataset.productVariantId;
      
      // Update button state based on wishlist
      if (productId && variantId) {
        if (Wishlist.has(productId, variantId)) {
          button.classList.add('favorite');
          const span = button.querySelector('span');
          if (span) {
            span.textContent = 'View Wishlist';
          }
        }
      }

      // Add click event listener
      button.addEventListener('click', function(e) {
        e.preventDefault();
        
        const productId = button.dataset.productId;
        const variantId = button.dataset.productVariantId;
        const productTitle = button.dataset.productTitle || '';
        const productPrice = button.dataset.productPrice || '0';
        const productImage = button.dataset.productImage || '';
        const productUrl = button.dataset.productUrl || '';

        if (!productId || !variantId) {
          console.error('Product ID or Variant ID missing');
          return;
        }

        // Check if already in wishlist
        if (Wishlist.has(productId, variantId)) {
          // Redirect to wishlist page
          window.location.href = WISHLIST_PAGE_URL;
        } else {
          // Add to wishlist
          const item = {
            productId: productId,
            variantId: variantId,
            title: productTitle,
            price: productPrice,
            image: productImage,
            url: productUrl,
            addedAt: new Date().toISOString()
          };

          if (Wishlist.add(item)) {
            button.classList.add('favorite');
            const span = button.querySelector('span');
            if (span) {
              span.textContent = 'View Wishlist';
            }
            
            // Dispatch custom event for other scripts to listen
            document.dispatchEvent(new CustomEvent('wishlist:added', {
              detail: item
            }));
          }
        }
      });
    });
  }

  // Update wishlist buttons when variant changes
  function updateWishlistButtonsOnVariantChange() {
    // Listen for multiple variant change event names
    const variantChangeEvents = ['variant:change', 'theme:variant:change', 'variant:changed', 'product:variant-change'];
    
    variantChangeEvents.forEach(function(eventName) {
      document.addEventListener(eventName, function(e) {
        const variant = e.detail ? e.detail.variant : null;
        if (!variant || !variant.id) return;

        const wishlistButtons = document.querySelectorAll('.btn-wishlist');
        wishlistButtons.forEach(function(button) {
          const productId = button.dataset.productId;
          if (!productId) return;
          
          const variantId = variant.id.toString();

          // Update variant ID in button
          button.dataset.productVariantId = variantId;
          if (variant.price) {
            button.dataset.productVariantPrice = variant.price;
            button.dataset.productPrice = variant.price;
          }

          // Update variant image if available
          if (variant.featured_image) {
            button.dataset.productImage = variant.featured_image.src || variant.featured_image;
          }

          // Update button state
          if (Wishlist.has(productId, variantId)) {
            button.classList.add('favorite');
            const span = button.querySelector('span');
            if (span) {
              span.textContent = 'View Wishlist';
            }
          } else {
            button.classList.remove('favorite');
            const span = button.querySelector('span');
            if (span) {
              span.textContent = 'Add to Wishlist';
            }
          }
        });
      });
    });

    // Also listen for form input changes (variant ID input)
    const variantInputs = document.querySelectorAll('input[name="id"][type="hidden"]');
    variantInputs.forEach(function(input) {
      input.addEventListener('change', function() {
        const variantId = input.value;
        if (!variantId) return;

        const wishlistButtons = document.querySelectorAll('.btn-wishlist');
        wishlistButtons.forEach(function(button) {
          const productId = button.dataset.productId;
          if (!productId) return;

          button.dataset.productVariantId = variantId;

          // Update button state
          if (Wishlist.has(productId, variantId)) {
            button.classList.add('favorite');
            const span = button.querySelector('span');
            if (span) {
              span.textContent = 'View Wishlist';
            }
          } else {
            button.classList.remove('favorite');
            const span = button.querySelector('span');
            if (span) {
              span.textContent = 'Add to Wishlist';
            }
          }
        });
      });
    });
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initWishlistButtons();
      updateWishlistButtonsOnVariantChange();
    });
  } else {
    initWishlistButtons();
    updateWishlistButtonsOnVariantChange();
  }

  // Make Wishlist utility available globally
  window.Wishlist = Wishlist;
  
  // Make initWishlistButtons available globally for re-initialization
  window.initWishlistButtons = initWishlistButtons;
  
  // Listen for dynamically added wishlist buttons
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType === 1) { // Element node
          // Check if the added node is a wishlist button or contains one
          if (node.classList && node.classList.contains('btn-wishlist')) {
            // Re-initialize wishlist buttons
            initWishlistButtons();
          } else if (node.querySelectorAll) {
            const wishlistButtons = node.querySelectorAll('.btn-wishlist');
            if (wishlistButtons.length > 0) {
              // Re-initialize wishlist buttons
              initWishlistButtons();
            }
          }
        }
      });
    });
  });
  
  // Start observing the document body for changes
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();
