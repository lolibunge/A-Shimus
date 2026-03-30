(function() {
  'use strict';

  const WISHLIST_STORAGE_KEY = 'shopify_wishlist';
  const WISHLIST_PAGE_URL = '/pages/swym-wishlist?';
  let swymEventsBound = false;

  // Wishlist utility functions (local fallback)
  const Wishlist = {
    getAll: function() {
      try {
        const wishlist = localStorage.getItem(WISHLIST_STORAGE_KEY);
        return wishlist ? JSON.parse(wishlist) : [];
      } catch (e) {
        console.error('Error reading wishlist:', e);
        return [];
      }
    },

    save: function(items) {
      try {
        localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
        return true;
      } catch (e) {
        console.error('Error saving wishlist:', e);
        return false;
      }
    },

    add: function(item) {
      const wishlist = this.getAll();
      const existingIndex = wishlist.findIndex(function(wishlistItem) {
        return wishlistItem.productId === item.productId && wishlistItem.variantId === item.variantId;
      });

      if (existingIndex === -1) {
        wishlist.push(item);
        this.save(wishlist);
        return true;
      }
      return false;
    },

    remove: function(productId, variantId) {
      const wishlist = this.getAll();
      const filtered = wishlist.filter(function(item) {
        return !(item.productId === productId && item.variantId === variantId);
      });
      this.save(filtered);
      return filtered.length < wishlist.length;
    },

    has: function(productId, variantId) {
      const wishlist = this.getAll();
      return wishlist.some(function(item) {
        return item.productId === productId && item.variantId === variantId;
      });
    },

    clear: function() {
      localStorage.removeItem(WISHLIST_STORAGE_KEY);
    },

    count: function() {
      return this.getAll().length;
    }
  };

  function setButtonFavoriteState(button, isFavorite) {
    if (!button) return;

    if (isFavorite) {
      button.classList.add('favorite');
    } else {
      button.classList.remove('favorite');
    }

    const span = button.querySelector('span');
    if (span) {
      span.textContent = isFavorite ? 'View Wishlist' : 'Add to Wishlist';
    }
  }

  function getSwym() {
    return window._swat || window.swat || null;
  }

  function onSwymReady(callback) {
    const swat = getSwym();
    if (swat) {
      callback(swat);
      return;
    }

    window.SwymCallbacks = window.SwymCallbacks || [];
    window.SwymCallbacks.push(callback);
  }

  function syncSwymWishlistState(swat) {
    if (!swat || typeof swat.fetchLists !== 'function') return;

    swat.fetchLists({
      callbackFn: function(listData) {
        const variantIds = new Set();
        const productIds = new Set();

        (listData || []).forEach(function(list) {
          (list.listcontents || []).forEach(function(item) {
            const variantId = String(item.variant_id || item.variantId || item.vid || item.epi || '');
            const productId = String(item.product_id || item.productId || item.pid || item.empi || '');

            if (variantId) variantIds.add(variantId);
            if (productId) productIds.add(productId);
          });
        });

        document.querySelectorAll('.btn-wishlist').forEach(function(button) {
          const productId = String(button.dataset.productId || '');
          const variantId = String(button.dataset.productVariantId || '');
          const isFavorite = (variantId && variantIds.has(variantId)) || (productId && productIds.has(productId));
          setButtonFavoriteState(button, isFavorite);
        });
      },
      onError: function(error) {
        console.error('Swym fetchLists error:', error);
      }
    });
  }

  function handleSwymWishlistClick(button, swat) {
    if (!button || !swat) return false;

    if (button.classList.contains('favorite')) {
      if (swat.ui && typeof swat.ui.open === 'function') {
        swat.ui.open();
      }
      return true;
    }

    const productId = button.dataset.productId;
    const variantId = button.dataset.productVariantId;
    const productTitle = button.dataset.productTitle || '';
    const productPriceRaw = Number(button.dataset.productVariantPrice || button.dataset.productPrice || 0);
    const productImage = button.dataset.productImage || '';
    const productUrl = button.dataset.productUrl || '';

    if (!productId || !variantId) {
      console.error('Product ID or Variant ID missing');
      return false;
    }

    const addToWishlist = swat.addToWishList || swat.addToWishlist;
    if (typeof addToWishlist !== 'function') {
      console.error('Swym addToWishList method not available');
      return false;
    }

    const productData = {
      epi: Number(variantId),
      empi: Number(productId),
      du: productUrl ? (productUrl.startsWith('http') ? productUrl : window.location.origin + productUrl) : window.location.href,
      dt: productTitle,
      iu: productImage,
      pr: Number.isFinite(productPriceRaw) ? productPriceRaw / 100 : 0
    };

    addToWishlist.call(
      swat,
      productData,
      function() {
        setButtonFavoriteState(button, true);
        syncSwymWishlistState(swat);
        document.dispatchEvent(new CustomEvent('wishlist:added', {
          detail: productData
        }));
      },
      function(error) {
        console.error('Swym addToWishList error:', error);
      }
    );

    return true;
  }

  function handleLocalWishlistClick(button) {
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

    if (Wishlist.has(productId, variantId)) {
      window.location.href = WISHLIST_PAGE_URL;
      return;
    }

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
      setButtonFavoriteState(button, true);
      document.dispatchEvent(new CustomEvent('wishlist:added', {
        detail: item
      }));
    }
  }

  // Initialize wishlist buttons on page load
  function initWishlistButtons() {
    const wishlistButtons = document.querySelectorAll('.btn-wishlist');

    wishlistButtons.forEach(function(button) {
      const productId = button.dataset.productId;
      const variantId = button.dataset.productVariantId;
      const isSwymButton = button.classList.contains('swym-button') && button.dataset.swaction === 'addToWishlist';

      if (button.dataset.wishlistInitialized !== 'true') {
        button.dataset.wishlistInitialized = 'true';

        button.addEventListener('click', function(e) {
          const swat = getSwym();

          if (isSwymButton) {
            const isAlreadyWishlisted = button.classList.contains('favorite') || button.classList.contains('swym-added');

            if (isAlreadyWishlisted) {
              e.preventDefault();
              window.location.href = WISHLIST_PAGE_URL;
              return;
            }

            // If Swym is ready, let Swym fully handle the add-to-list click/modal flow.
            if (swat) return;

            // Fallback only when Swym is unavailable.
            e.preventDefault();
            handleLocalWishlistClick(button);
            return;
          }

          e.preventDefault();

          if (swat && handleSwymWishlistClick(button, swat)) {
            return;
          }

          // If Swym is still booting, wait briefly before falling back to local storage.
          if (Array.isArray(window.SwymCallbacks)) {
            let resolved = false;
            const fallbackTimer = setTimeout(function() {
              if (!resolved) {
                resolved = true;
                handleLocalWishlistClick(button);
              }
            }, 700);

            onSwymReady(function(readySwat) {
              if (resolved) return;
              resolved = true;
              clearTimeout(fallbackTimer);
              if (!handleSwymWishlistClick(button, readySwat)) {
                handleLocalWishlistClick(button);
              }
            });
            return;
          }

          handleLocalWishlistClick(button);
        });
      }

      if (productId && variantId && !isSwymButton) {
        setButtonFavoriteState(button, Wishlist.has(productId, variantId));
      }
    });

    // If Swym exists now or loads later, sync states from Wishlist Plus.
    const swat = getSwym();
    if (swat) {
      syncSwymWishlistState(swat);
    }

    onSwymReady(function(readySwat) {
      if (typeof readySwat.initializeActionButtons === 'function') {
        try {
          readySwat.initializeActionButtons('body');
        } catch (error) {
          console.warn('Swym initializeActionButtons error:', error);
        }
      }

      syncSwymWishlistState(readySwat);

      if (!swymEventsBound && readySwat.evtLayer && readySwat.JSEvents) {
        swymEventsBound = true;

        readySwat.evtLayer.addEventListener(readySwat.JSEvents.addedToWishlist, function() {
          syncSwymWishlistState(readySwat);
        });

        readySwat.evtLayer.addEventListener(readySwat.JSEvents.removedFromWishlist, function() {
          syncSwymWishlistState(readySwat);
        });
      }
    });
  }

  // Update wishlist buttons when variant changes
  function updateWishlistButtonsOnVariantChange() {
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
          button.dataset.productVariantId = variantId;
          button.dataset.variantId = variantId;
          button.dataset.epi = variantId;
          button.dataset.empi = productId;

          if (variant.price) {
            button.dataset.productVariantPrice = variant.price;
            button.dataset.productPrice = variant.price;
            button.dataset.pr = String(variant.price / 100);
          }

          if (variant.featured_image) {
            button.dataset.productImage = variant.featured_image.src || variant.featured_image;
            button.dataset.iu = button.dataset.productImage;
          }

          button.dataset.du = button.dataset.productUrl || '';
          button.dataset.dt = button.dataset.productTitle || '';

          const swat = getSwym();
          if (swat) {
            syncSwymWishlistState(swat);
          } else {
            setButtonFavoriteState(button, Wishlist.has(productId, variantId));
          }
        });
      });
    });

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
          button.dataset.variantId = variantId;
          button.dataset.epi = variantId;
          button.dataset.empi = productId;

          const productVariantPrice = Number(button.dataset.productVariantPrice || button.dataset.productPrice || 0);
          if (Number.isFinite(productVariantPrice) && productVariantPrice > 0) {
            button.dataset.pr = String(productVariantPrice / 100);
          }

          if (button.dataset.productImage) {
            button.dataset.iu = button.dataset.productImage;
          }
          button.dataset.du = button.dataset.productUrl || '';
          button.dataset.dt = button.dataset.productTitle || '';

          const swat = getSwym();
          if (swat) {
            syncSwymWishlistState(swat);
          } else {
            setButtonFavoriteState(button, Wishlist.has(productId, variantId));
          }
        });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initWishlistButtons();
      updateWishlistButtonsOnVariantChange();
    });
  } else {
    initWishlistButtons();
    updateWishlistButtonsOnVariantChange();
  }

  window.Wishlist = Wishlist;
  window.initWishlistButtons = initWishlistButtons;

  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType !== 1) return;

        if (node.classList && node.classList.contains('btn-wishlist')) {
          initWishlistButtons();
          return;
        }

        if (node.querySelectorAll) {
          const wishlistButtons = node.querySelectorAll('.btn-wishlist');
          if (wishlistButtons.length > 0) {
            initWishlistButtons();
          }
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();
