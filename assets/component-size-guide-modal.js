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
      this.handleTrapFocus = this.handleTrapFocus.bind(this);
      this.previousActiveElement = null;
      this.editorEventsBound = false;
    }

    connectedCallback() {
      window.wetheme.webcomponentRegistry.register({key: 'component-size-guide-modal'});

      window.eventBus.on('open:size:guide', this.openModal);
      window.eventBus.on('close:size:guide', this.closeModal);

      this.closeElements.forEach((element) => {
        element.addEventListener('click', this.closeModal);
      });

      document.addEventListener('keydown', this.handleKeydown);
    }

    disconnectedCallback() {
      window.eventBus.off('open:size:guide', this.openModal);
      window.eventBus.off('close:size:guide', this.closeModal);
      document.removeEventListener('keydown', this.handleKeydown);
      this.removeEventListener('keydown', this.handleTrapFocus);
      this.closeElements.forEach((element) => {
        element.removeEventListener('click', this.closeModal);
      });
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

      this.previousActiveElement = document.activeElement;
      this.setAttribute('aria-hidden', 'false');
      document.body.classList.add('size-guide-modal-open');
      this.trapFocus();
      this.handleEditorEvents();
    }

    closeModal() {
      this.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('size-guide-modal-open');
      this.removeEventListener('keydown', this.handleTrapFocus);

      if (this.previousActiveElement) {
        this.previousActiveElement.focus();
      }
    }

    trapFocus() {
      this.focusableElements = this.querySelectorAll('button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])');
      this.firstFocusableElement = this.focusableElements[0];
      this.lastFocusableElement = this.focusableElements[this.focusableElements.length - 1];

      if (this.firstFocusableElement) {
        this.firstFocusableElement.focus();
      }

      this.removeEventListener('keydown', this.handleTrapFocus);
      this.addEventListener('keydown', this.handleTrapFocus);
    }

    handleTrapFocus(event) {
      if (event.key !== 'Tab') return;
      if (!this.firstFocusableElement || !this.lastFocusableElement) return;

      if (event.shiftKey) {
        if (document.activeElement === this.firstFocusableElement) {
          this.lastFocusableElement.focus();
          event.preventDefault();
        }
      } else if (document.activeElement === this.lastFocusableElement) {
        this.firstFocusableElement.focus();
        event.preventDefault();
      }
    }

    // Fetch and load page content from the given URL
    async loadPageContent(url) {
      try {
        if (this.pageContentContainer) {
          this.pageContentContainer.innerHTML = '';
        }

        if (this.pageTitleContainer) {
          this.pageTitleContainer.innerHTML = '';
        }

        const response = await fetch(url, { credentials: 'same-origin' });
        if (!response.ok) {
          throw new Error(`Failed to fetch content: ${response.status}`);
        }

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const pageTitle = doc.querySelector('.main-page-content [data-page-title], .template-title--wrapper [data-page-title], [data-page-title]');
        if (pageTitle && this.pageTitleContainer) {
          this.pageTitleContainer.textContent = pageTitle.textContent.trim();
        }

        if (!this.pageContentContainer) return;

        let hasLoadedContent = false;

        const dedicatedSizeChart = doc.querySelector('.size-chart-content');
        if (dedicatedSizeChart) {
          this.pageContentContainer.appendChild(dedicatedSizeChart.cloneNode(true));
          hasLoadedContent = true;
        }

        if (!hasLoadedContent) {
          const customHtmlBlocks = doc.querySelectorAll('.custom-html .text-link-animated');
          if (customHtmlBlocks.length > 0) {
            customHtmlBlocks.forEach((block) => {
              this.pageContentContainer.appendChild(block.cloneNode(true));
            });
            hasLoadedContent = true;
          }
        }

        if (!hasLoadedContent) {
          const mainPageContent = doc.querySelector('.main-page-content .grid__item--page, .main-page-content .rte.text-link-animated, .main-page-content');
          if (mainPageContent) {
            const contentClone = mainPageContent.cloneNode(true);
            const sidebar = contentClone.querySelector('[data-sidebar-content]');
            if (sidebar) sidebar.remove();
            this.pageContentContainer.appendChild(contentClone);
            hasLoadedContent = true;
          }
        }

        if (!hasLoadedContent) {
          this.pageContentContainer.innerHTML = '<p>Unable to load size chart content.</p>';
        }
      } catch (error) {
        console.error('Error loading size guide content:', error);
        if (this.pageContentContainer) {
          this.pageContentContainer.innerHTML = '<p>Error loading content. Please try again.</p>';
        }
      }
    }

    handleEditorEvents() {
      if (!window.Shopify.designMode || this.editorEventsBound) return;

      document.addEventListener('shopify:section:load', () => {
        const sizeGuideLink = document.querySelector('product-information a[data-size-guide-link]');
        if (sizeGuideLink && sizeGuideLink.href) {
          this.loadPageContent(sizeGuideLink.href);
        }
      });

      this.editorEventsBound = true;
    }
  }

  customElements.define('size-guide-modal', SizeGuideModal);
}
/******/ })()
;
