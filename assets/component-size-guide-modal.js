/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
if (!customElements.get('size-guide-modal')) {
  class SizeGuideModal extends HTMLElement {
    constructor() {
      super();
      this.pageTitleContainer = this.querySelector('[data-size-guide-dynamic-content="size-guide-header"] h3');
      this.pageContentContainer = this.querySelector('[data-size-guide-content], .size-guide-modal__body--content');
      this.closeElements = this.querySelectorAll('[data-size-guide-close]');
      this.modalContent = this.querySelector('.size-guide-modal__content');
      this.loadPageContent = this.loadPageContent.bind(this);
      this.openModal = this.openModal.bind(this);
      this.closeModal = this.closeModal.bind(this);
      this.handleKeydown = this.handleKeydown.bind(this);
      this.previousActiveElement = null;
    }

    connectedCallback() {
      window.wetheme.webcomponentRegistry.register({key: 'component-size-guide-modal'});
      
      // Event listeners
      window.eventBus.on('open:size:guide', this.openModal);
      window.eventBus.on('close:size:guide', this.closeModal);
      
      this.closeElements.forEach((element) => {
        element.addEventListener('click', this.closeModal);
      });

      // Close on Escape key
      document.addEventListener('keydown', this.handleKeydown);
    }

    disconnectedCallback() {
      window.eventBus.off('open:size:guide', this.openModal);
      window.eventBus.off('close:size:guide', this.closeModal);
      document.removeEventListener('keydown', this.handleKeydown);
    }

    handleKeydown(event) {
      if (event.key === 'Escape' && this.getAttribute('aria-hidden') === 'false') {
        this.closeModal();
      }
    }

    async openModal(event) {
      if (event && event.url) {
        await this.loadPageContent(event.url);
      }
      
      // Store the element that was focused before opening the modal
      this.previousActiveElement = document.activeElement;
      
      this.setAttribute('aria-hidden', 'false');
      document.body.classList.add('size-guide-modal-open');
      
      // Trap focus
      this.trapFocus();
      
      // Handle editor events
      this.handleEditorEvents();
    }

    closeModal() {
      this.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('size-guide-modal-open');
      
      // Return focus to previous element
      if (this.previousActiveElement) {
        this.previousActiveElement.focus();
      }
    }

    trapFocus() {
      const focusableElements = this.querySelectorAll('button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])');
      const firstFocusableElement = focusableElements[0];
      const lastFocusableElement = focusableElements[focusableElements.length - 1];
      
      if (firstFocusableElement) {
        firstFocusableElement.focus();
      }
      
      this.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (document.activeElement === firstFocusableElement) {
              lastFocusableElement.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === lastFocusableElement) {
              firstFocusableElement.focus();
              e.preventDefault();
            }
          }
        }
      });
    }

    // Fetch and load page content from the given URL
    async loadPageContent(url) {
      try {
        // Clear existing content
        if (this.pageContentContainer) {
          this.pageContentContainer.innerHTML = '';
        }
        
        if (this.pageTitleContainer) {
          this.pageTitleContainer.innerHTML = '';
        }
        
        // Fetch the page content
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch content: ${response.status}`);
        }
        
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const pageTitle = doc.querySelector('.main-page-content [data-page-title]');
        
        if (pageTitle && this.pageTitleContainer) {
          this.pageTitleContainer.textContent = pageTitle.textContent;
        }
        
        // Extract the main content from the page
        const pageContent = doc.querySelector('.main-page-content');
        
        if (pageContent && this.pageContentContainer) {
          // Find the actual content element (rte with page.content)
          const rteContent = pageContent.querySelector('.rte.text-link-animated, .grid__item--page, .rte');
          
          if (rteContent) {
            // Clone and append only the content, not the wrapper
            const contentClone = rteContent.cloneNode(true);
            this.pageContentContainer.appendChild(contentClone);
          } else {
            // Fallback: try to get inner content without wrappers
            const gridItem = pageContent.querySelector('.grid__item--page');
            if (gridItem) {
              const contentClone = gridItem.cloneNode(true);
              this.pageContentContainer.appendChild(contentClone);
            } else {
              // Last resort: append the whole main-page-content but clean it up
              const contentClone = pageContent.cloneNode(true);
              // Remove sidebar if present
              const sidebar = contentClone.querySelector('[data-sidebar-content]');
              if (sidebar) sidebar.remove();
              // Remove title wrapper if present
              const titleWrapper = contentClone.querySelector('.template-title--wrapper');
              if (titleWrapper) titleWrapper.remove();
              this.pageContentContainer.appendChild(contentClone);
            }
          }
        }
      } catch (error) {
        console.error('Error loading size guide content:', error);
        if (this.pageContentContainer) {
          this.pageContentContainer.innerHTML = '<p>Error loading content. Please try again.</p>';
        }
      }
    }

    handleEditorEvents() {
      if (window.Shopify.designMode) {
        document.addEventListener('shopify:section:load', () => {
          const sizeGuideLink = document.querySelector('product-information a[data-size-guide-link]');
          if (sizeGuideLink) {
            const href = sizeGuideLink.href;
            if (href) {
              this.loadPageContent(href);
            }
          }
        });
      }
    }
  }

  customElements.define('size-guide-modal', SizeGuideModal);
}
/******/ })()
;
