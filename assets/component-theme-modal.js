/******/ (() => { // webpackBootstrap
if (!customElements.get('theme-modal')) {
  const Z_INDEX = {
    MODAL_ABOVE_DRAWER: '1400',
    MODAL_DEFAULT: '1501'
  };
  
  class ThemeModal extends HTMLElement {
    constructor() {
      super();
      this.modalId = 'ThemeModal';
      this.modalContentSelector = '[data-modal-content] .theme-modal--inner';
      this.focusableSelector = 'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])';
      this.restoreFocusOnClose = this.getAttribute('data-focus-on-close');
      this.cacheDOMElements();
      this.bindEventHandlers();
      window._myModalCache = window._myModalCache || {};

      // Check if a drawer is opened
      this.bodyClassObserver = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            if (document.body.className.includes('js-drawer-open')) {
              if (this.overlay) this.overlay.removeEventListener('click', this.hideModal);
            } else {
              if (this.overlay) this.overlay.addEventListener('click', this.hideModal);
            }
          }
        }
      });
    }

    cacheDOMElements() {
      this.sectionId = this.getAttribute('data-section-id');
      this.sectionFetchId = this.getAttribute('data-section-fetch-id');
      this.productUrl = this.getAttribute('data-product-url');
      this.contentSelector = this.getAttribute('data-content-selector');
      this.shouldFetchSection = this.hasAttribute('data-fetch-section');
      this.blockId = this.getAttribute('data-block-id');
      this.modalButton = this.querySelector('[data-modal-button]');
      this.modalTemplate = this.querySelector('template[data-theme-modal-content]');
      this.overlay = document.querySelector('#DrawerOverlay');
      this.modalContent = this.querySelector('[data-modal-content]');
      this.isQuickView = this.hasAttribute('data-is-quick-view');

      // Early return if required elements are missing
      if (!this.modalButton || !this.modalTemplate) {
        console.warn('Theme Modal: Required elements missing');
        return;
      }
    }

    bindEventHandlers() {
      this.showModal = this.showModal.bind(this);
      this.hideModal = this.hideModal.bind(this);
      this.handleKeydown = this.handleKeydown.bind(this);
      this.handleDrawerOpened = this.handleDrawerOpened.bind(this);
      this.handleDrawerClosed = this.handleDrawerClosed.bind(this);
    }

    connectedCallback() {
      // Listen for generic modal hide event
      window.eventBus.on('theme:modal:hide', this.hideModal);

      // Show modal when button is clicked
      this.modalButton.addEventListener('click', this.showModal);

      // Change modal z-index when drawer opens
      window.eventBus.on('drawer:opened', this.handleDrawerOpened);

      // Change modal z-index when drawer closes
      window.eventBus.on('drawer:closed', this.handleDrawerClosed);

      // Prefetch modal content when product card is hovered
      if (this.shouldFetchSection) {
        const productCard = this.closest('product-card');
        if (productCard) {
          let hoverTimer;

          // Prefetch modal content when product card is hovered
          productCard.addEventListener('mouseenter', () => {
            hoverTimer = setTimeout(() => {
              this.prefetch();
            }, 250); // 250ms delay
          });

          // Clear the timer if the mouse leaves the product card
          productCard.addEventListener('mouseleave', () => clearTimeout(hoverTimer));

          // Handle touch events for mobile
          productCard.addEventListener('touchstart', () => {
            this.prefetch();
          }, { once: true });
        }
      }

      // Handle editor events
      if (window.Shopify.designMode) {
        document.addEventListener('shopify:section:load', async () => {
          // Hide the modal if it's already open
          this.hideModal();
        });
      }
    }

    handleDrawerOpened() {
      const modal = document.querySelector('#ThemeModal');
      if (modal) {
        modal.style.zIndex = Z_INDEX.MODAL_ABOVE_DRAWER;
      }
    }
      
    handleDrawerClosed() {
      const modal = document.querySelector('#ThemeModal');
      if (modal) {
        setTimeout(() => {
          modal.style.zIndex = Z_INDEX.MODAL_DEFAULT;
        }, 600);
      }
    }

    disconnectedCallback() {
      // Stop observing the body class
      this.bodyClassObserver.disconnect();

      // Clean up event listeners
      this.modalButton.removeEventListener('click', this.showModal);
      if (this.overlay) this.overlay.removeEventListener('click', this.hideModal);
      if (this.dismissButton) this.dismissButton.removeEventListener('click', this.hideModal);

      // Remove event listeners for drawer events
      window.eventBus.off('drawer:opened', this.handleDrawerOpened);
      window.eventBus.off('drawer:closed', this.handleDrawerClosed);
      window.eventBus.off('theme:modal:hide', this.hideModal);
    }

    buildModalFetchUrl(rawUrl, variantId) {
      if (!rawUrl) return null;

      try {
        const normalizedUrl = new URL(rawUrl, window.location.origin);

        if (variantId && !normalizedUrl.searchParams.get('variant')) {
          normalizedUrl.searchParams.set('variant', variantId);
        }

        // Preserve theme preview context when fetching from the storefront.
        const currentUrl = new URL(window.location.href);
        ['preview_theme_id', '_fd', 'pb'].forEach((param) => {
          const paramValue = currentUrl.searchParams.get(param);
          if (paramValue && !normalizedUrl.searchParams.get(param)) {
            normalizedUrl.searchParams.set(param, paramValue);
          }
        });

        return normalizedUrl.toString();
      } catch (error) {
        console.error('Theme Modal: Invalid modal fetch URL', rawUrl, error);
        return null;
      }
    }

    getModalFetchUrls() {
      const urls = [];
      const seen = new Set();
      const primaryUrl = this.productUrl || '';
      let variantId = null;

      if (primaryUrl) {
        try {
          variantId = new URL(primaryUrl, window.location.origin).searchParams.get('variant');
        } catch (error) {
          variantId = null;
        }
      }

      const addUrl = (candidate) => {
        const normalized = this.buildModalFetchUrl(candidate, variantId);
        if (!normalized || seen.has(normalized)) return;
        seen.add(normalized);
        urls.push(normalized);
      };

      const addCanonicalProductUrlFromCollectionPath = (candidate) => {
        if (!candidate) return;

        try {
          const parsed = new URL(candidate, window.location.origin);
          const collectionToken = '/collections/';
          const productsToken = '/products/';
          const collectionIndex = parsed.pathname.indexOf(collectionToken);
          const productIndex = parsed.pathname.indexOf(productsToken);

          if (collectionIndex === -1 || productIndex === -1 || collectionIndex > productIndex) return;

          const localePrefix = parsed.pathname.slice(0, collectionIndex);
          const productPath = parsed.pathname.slice(productIndex);
          const canonicalPath = `${localePrefix}${productPath}`.replace(/\/{2,}/g, '/');
          const canonicalUrl = new URL(canonicalPath, parsed.origin);

          parsed.searchParams.forEach((value, key) => {
            canonicalUrl.searchParams.set(key, value);
          });

          addUrl(canonicalUrl.toString());
        } catch (error) {
          // Ignore malformed candidate URLs and continue with others.
        }
      };

      const candidates = [
        this.productUrl,
        this.modalButton?.getAttribute('href')
      ];

      const productCard = this.closest('product-card');
      if (productCard) {
        candidates.push(productCard.getAttribute('data-product-url'));
        candidates.push(productCard.querySelector('a.grid__image')?.getAttribute('href'));
        candidates.push(productCard.querySelector('a[data-product-card-link]')?.getAttribute('href'));
      }

      candidates.forEach((candidate) => {
        addUrl(candidate);
        addCanonicalProductUrlFromCollectionPath(candidate);
      });

      return urls;
    }

    prefetch() {
      const fetchUrls = this.getModalFetchUrls();
      const url = fetchUrls[0] || `${window.Shopify.routes.root}?section_id=${this.sectionFetchId}`;
      if (!url) return;
    
      if (window._myModalCache[url]) {
        // Already cached
        this._prefetchedModalHTML = window._myModalCache[url];
        return;
      }
    
      // Fetch modal content in the background
      this.fetchModalContentInBackground()
        .then(() => {
          // Mark as fetched
          window._myModalCache[url] = this._prefetchedModalHTML;
        })
        .catch(err => {
          console.error('Prefetch error:', err);
        });
    }
    
    async fetchModalContentInBackground() {
      try {
        const fallbackUrl = `${window.Shopify.routes.root}?section_id=${this.sectionFetchId}`;
        const fetchUrls = this.getModalFetchUrls();
        if (fetchUrls.length === 0 && this.sectionFetchId) {
          fetchUrls.push(fallbackUrl);
        }

        let lastError = null;

        for (const url of fetchUrls) {
          try {
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`Failed to fetch modal content: ${response.status} (${url})`);
            }

            const textContent = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(textContent, 'text/html');
            const contentNode = this.contentSelector ? doc.querySelector(this.contentSelector) : null;
            const relevantContent = this.contentSelector ? contentNode?.innerHTML : textContent;

            if (this.contentSelector && !contentNode) {
              throw new Error(`Modal selector not found in response: ${this.contentSelector} (${url})`);
            }

            // Store it so we can inject it later
            this._prefetchedModalHTML = relevantContent || '';
            return;
          } catch (error) {
            lastError = error;
          }
        }

        if (lastError) {
          throw lastError;
        }
      } catch (error) {
        console.error('Theme Modal: Error prefetching content', error);
        throw error; // rethrow so the .catch in prefetch() sees it
      }
    }    

    initScrollHandler(el) {
      if (!el) return;
      let scrolling;

      el.addEventListener('scroll', () => {
        clearTimeout(scrolling);
        el.classList.add('scrolling');
        scrolling = setTimeout(() => {
          el.classList.remove('scrolling');
        }, 800);
      });
    }

    async render() {
      try {
        const modalContent = document.querySelector(`#${this.modalId}`);
        if (!modalContent) {
          console.warn('Theme Modal: Modal content element not found');
          return false;
        }
    
        // Insert your template
        modalContent.innerHTML = this.modalTemplate.innerHTML;
        this.modalContent = modalContent;
        this.dismissButton = this.modalContent.querySelector('[data-close]');
    
        // Set up the dismiss button, etc.
        if (this.dismissButton) {
          this.dismissButton.addEventListener('click', this.hideModal);
        }
    
        // If we have prefetched content in memory, just inject it, no fetch
        if (this._prefetchedModalHTML) {
          const targetElement = document.querySelector(`#${this.modalId} ${this.modalContentSelector}`);
          if (!targetElement) {
            console.error('Modal content target element not found');
            return false;
          }
          targetElement.innerHTML = this._prefetchedModalHTML;
          // Emit an event that the content is ready
          this.isQuickView ?
            window.eventBus.emit('product:modal:ready', { detail: { sectionId: this.quickViewSectionId } })
            : window.eventBus.emit('product:modal:ready', { detail: { sectionId: this.sectionId } });
        }
        // otherwise do the original fetch if needed
        else if (this.shouldFetchSection && (this.sectionFetchId || this.productUrl)) {
          await this.fetchModalContent(); // your original fetch that also injects into DOM
        }
    
        return true;
      } catch (error) {
        console.error('Theme Modal: Error rendering modal', error);
        return false;
      }
    }    

    async showModal(e) {
      e.stopPropagation();
      e.preventDefault();

      // If quick view, add a class to the modal
      if (this.isQuickView) {
        document.querySelector('#ThemeModal')?.classList.add('is-quick-view');
      }

      // Emit an event that the modal is being shown
      window.eventBus.emit('theme:modal:open', { details: { sectionId: this.sectionId } });

      // Start observing the body class
      this.bodyClassObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['class']
      });
    
      // Store the element that was focused before opening the modal
      this.previousActiveElement = e.currentTarget;
    
      const rendered = await this.render();
      if (rendered) {
        document.body.classList.add('theme-modal-open');
        if (this.modalContent) {
          this.quickViewProduct = this.modalContent.querySelector('[data-quick-view-product] [data-product-content-wrapper]');
          this.quickViewSectionId = this.quickViewProduct?.getAttribute('data-section-id');
          this.modalContent.classList.remove('hidden');
          
          this.trapFocus();
    
          const scrollableInner = this.modalContent.querySelector('[data-modal-content]');
          if (scrollableInner) {
            this.initScrollHandler(scrollableInner);
          }
        }
      }
    }    

    hideModal() {
      const modalIsOpen = document.body.classList.contains('theme-modal-open');
      // Remove the open class to trigger the CSS fade-out/transform transition
      document.body.classList.remove('theme-modal-open');

      // Emit an event that the modal is being closed
      window.eventBus.emit('theme:modal:close', { details: { sectionId: this.sectionId } });
    
      // Emit event before cleaning up (if other parts of your code need to know)
      this.isQuickView ?
        window.eventBus.emit('product:modal:close', { detail: { sectionId: this.quickViewSectionId, isQuickView: true } })
        : window.eventBus.emit('product:modal:close', { detail: { sectionId: this.sectionId, isQuickView: false } });
    
      // Remove keydown listener
      document.removeEventListener('keydown', this.handleKeydown);
    
      // Stop observing the body class
      this.bodyClassObserver.disconnect();
    
      // Clean up event listeners for overlay and dismiss button
      if (this.overlay) this.overlay.removeEventListener('click', this.hideModal);
      if (this.dismissButton) this.dismissButton.removeEventListener('click', this.hideModal);
    
      // Delay clearing modal content until after the CSS transition finishes
      if (this.modalContent) {
        const timeoutId = setTimeout(() => {
          this.modalContent.innerHTML = '';
        }, 1000); // Fallback after 1s

        if (modalIsOpen) {
          this.modalContent.addEventListener('transitionend', () => {
            clearTimeout(timeoutId);
            
            // Clear the modal content
            this.modalContent.innerHTML = '';
            
            if (this.isQuickView) {
              document.querySelector('#ThemeModal')?.classList.remove('is-quick-view');
            }
          }, { once: true });
        }
      }
    
      // Return focus to the previously active element
      if (this.restoreFocusOnClose === 'true' &&
          this.previousActiveElement &&
          typeof this.previousActiveElement.focus === 'function') {
        this.previousActiveElement.focus();
      }
    }

    trapFocus() {
      const focusableElements = this.modalContent.querySelectorAll(this.focusableSelector);
      const firstElement = focusableElements[0];
      
      if (!firstElement) return;

      document.addEventListener('keydown', this.handleKeydown);
      requestAnimationFrame(() => firstElement.focus());
    }

    handleKeydown(event) {
      const focusableElements = this.modalContent.querySelectorAll(this.focusableSelector);
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      if (!firstElement || !lastElement) return;

      const isTabPressed = event.key === 'Tab';
      const isEscapePressed = event.key === 'Escape';

      if (isEscapePressed) {
        this.hideModal();
        return;
      }

      if (!isTabPressed) return;

      if (event.shiftKey && document.activeElement === firstElement) {
        lastElement.focus();
        event.preventDefault();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        firstElement.focus();
        event.preventDefault();
      }
    }

    async fetchModalContent() {
      try {
        const targetElement = document.querySelector(`#${this.modalId} ${this.modalContentSelector}`);
        if (!targetElement) {
          throw new Error('Modal content target element not found');
        }

        const fallbackUrl = `${window.Shopify.routes.root}?section_id=${this.sectionFetchId}`;
        const fetchUrls = this.getModalFetchUrls();
        if (fetchUrls.length === 0 && this.sectionFetchId) {
          fetchUrls.push(fallbackUrl);
        }

        let modalContent = '';
        let lastError = null;

        for (const url of fetchUrls) {
          try {
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`Failed to fetch modal content: ${response.status} (${url})`);
            }

            const textContent = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(textContent, 'text/html');
            const contentNode = this.contentSelector ? doc.querySelector(this.contentSelector) : null;

            if (this.contentSelector && !contentNode) {
              throw new Error(`Modal selector not found in response: ${this.contentSelector} (${url})`);
            }

            modalContent = this.contentSelector ? contentNode?.innerHTML || '' : textContent;
            break;
          } catch (error) {
            lastError = error;
          }
        }

        if (!modalContent && lastError) {
          throw lastError;
        }

        targetElement.innerHTML = modalContent;
        
        // Emit event after content is loaded
        this.isQuickView ?
          window.eventBus.emit('product:modal:ready', { detail: { sectionId: this.quickViewSectionId } })
          : window.eventBus.emit('product:modal:ready', { detail: { sectionId: this.sectionId } });
      } catch (error) {
        console.error('Theme Modal: Error fetching content', error);
        // Optionally show user-friendly error message in modal
        const targetElement = document.querySelector(`#${this.modalId} ${this.modalContentSelector}`);
        if (targetElement) {
          targetElement.innerHTML = '<p>Sorry, there was an error loading the content. Please try again.</p>';
        }
      }
    }
  }

  customElements.define('theme-modal', ThemeModal);
}

/******/ })()
;
