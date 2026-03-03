(function() {
  'use strict';
 
  // Generate short ID from section ID (simple hash)
  function generateShortId(sectionId) {
    let hash = 0;
    for (let i = 0; i < sectionId.length; i++) {
      const char = sectionId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 6);
  }

  // Get URL parameter
  function getURLParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }

  // Set URL parameter
  function setURLParameter(name, value) {
    const url = new URL(window.location);
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.set(name, value);
    } else {
      url.searchParams.delete(name);
    }
    window.history.pushState({}, '', url);
  }

  // Escape HTML for safe plain-text rendering
  function escapeHtml(unsafe) {
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Update products grid columns based on responsive settings
  function updateProductsGridColumns(productsGrid) {
    if (!productsGrid) return;
    
    const desktop = parseInt(productsGrid.dataset.productsPerRowDesktop) || 4;
    const tablet = parseInt(productsGrid.dataset.productsPerRowTablet) || 3;
    const mobile = parseInt(productsGrid.dataset.productsPerRowMobile) || 2;
    
    // Set CSS custom properties
    productsGrid.style.setProperty('--products-per-row-desktop', desktop);
    productsGrid.style.setProperty('--products-per-row-tablet', tablet);
    productsGrid.style.setProperty('--products-per-row-mobile', mobile);
    
    // Update grid template columns
    function updateGrid() {
      if (window.innerWidth >= 1025) {
        productsGrid.style.gridTemplateColumns = `repeat(${desktop}, 1fr)`;
      } else if (window.innerWidth >= 769) {
        productsGrid.style.gridTemplateColumns = `repeat(${tablet}, 1fr)`;
      } else {
        productsGrid.style.gridTemplateColumns = `repeat(${mobile}, 1fr)`;
      }
    }
    
    updateGrid();
    window.addEventListener('resize', updateGrid);
  }

  // Initialize collection expandable functionality
  function initCollectionExpandable() {
    const sections = document.querySelectorAll('.collection-expandable-section');
    
    sections.forEach(function(section) {
      const sectionId = section.dataset.sectionId;
      
      // Get collection data from JSON
      const dataScript = document.getElementById(`collection-data-${sectionId}`);
      if (!dataScript) return;
      
      let collectionData;
      try {
        collectionData = JSON.parse(dataScript.textContent);
      } catch (e) {
        console.error('Error parsing collection data:', e);
        return;
      }
      
      // Get all DOM elements once
      const collectionBlocksContainer = section.querySelector('.collection-expandable-blocks');
      const expandedView = section.querySelector('.collection-expandable-expanded');
      const navigationCenter = section.querySelector('.collection-expandable-navigation-center-button');
      const navigationPrev = section.querySelector('.collection-expandable-navigation-arrow--prev');
      const navigationNext = section.querySelector('.collection-expandable-navigation-arrow--next');
      const navigationTitle = section.querySelector('[data-collection-title]');
      const navigationDescription = section.querySelector('[data-collection-description]');
      const navigationPrevText = section.querySelector('[data-prev-collection-title]');
      const navigationNextText = section.querySelector('[data-next-collection-title]');
      const productsGrid = section.querySelector('.collection-expandable-products-grid');
      const buttons = section.querySelectorAll('.collection-expandable-block-button');
      
      // Get mobile navigation elements
      const navigationMobile = section.querySelector('.collection-expandable-navigation-mobile');
      const navigationMobilePrev = navigationMobile ? navigationMobile.querySelector('.collection-expandable-navigation-arrow--prev') : null;
      const navigationMobileNext = navigationMobile ? navigationMobile.querySelector('.collection-expandable-navigation-arrow--next') : null;
      const navigationMobilePrevText = navigationMobile ? navigationMobile.querySelector('[data-prev-collection-title]') : null;
      const navigationMobileNextText = navigationMobile ? navigationMobile.querySelector('[data-next-collection-title]') : null;
      
      // Generate short ID for URL parameter (e.g., "c" instead of long section ID)
      const shortId = generateShortId(sectionId);
      const urlParamName = 'c';
      const activeCollectionIndex = getURLParameter(urlParamName);

      // Check if there's an active collection in URL (by index)
      if (activeCollectionIndex !== null) {
        const index = parseInt(activeCollectionIndex, 10);
        if (!isNaN(index) && index >= 0 && index < collectionData.collection_blocks.length) {
          const activeCollection = collectionData.collection_blocks[index];
          
          if (activeCollection) {
            expandCollectionByData(activeCollection, collectionData, section, index, {
              collectionBlocksContainer: collectionBlocksContainer,
              expandedView: expandedView,
              navigationTitle: navigationTitle,
              navigationDescription: navigationDescription,
              navigationPrev: navigationPrev,
              navigationNext: navigationNext,
              navigationPrevText: navigationPrevText,
              navigationNextText: navigationNextText,
              navigationMobilePrev: navigationMobilePrev,
              navigationMobileNext: navigationMobileNext,
              navigationMobilePrevText: navigationMobilePrevText,
              navigationMobileNextText: navigationMobileNextText,
              productsGrid: productsGrid
            });
          }
        }
      }

      // Handle button clicks
      buttons.forEach(function(button) {
        button.addEventListener('click', function(e) {
          e.preventDefault();
          const handle = button.dataset.collectionHandle;
          const blockId = button.dataset.blockId;
          
          // Find collection by handle and get its index
          const collectionIndex = collectionData.collection_blocks.findIndex(function(block) {
            return block.handle === handle || block.id === blockId;
          });
          
          if (collectionIndex !== -1) {
            const collection = collectionData.collection_blocks[collectionIndex];
            expandCollectionByData(collection, collectionData, section, collectionIndex, {
              collectionBlocksContainer: collectionBlocksContainer,
              expandedView: expandedView,
              navigationTitle: navigationTitle,
              navigationDescription: navigationDescription,
              navigationPrev: navigationPrev,
              navigationNext: navigationNext,
              navigationPrevText: navigationPrevText,
              navigationNextText: navigationNextText,
              navigationMobilePrev: navigationMobilePrev,
              navigationMobileNext: navigationMobileNext,
              navigationMobilePrevText: navigationMobilePrevText,
              navigationMobileNextText: navigationMobileNextText,
              productsGrid: productsGrid
            });
          }
        });
      });

      // Handle navigation center click (close)
      if (navigationCenter) {
        navigationCenter.addEventListener('click', function(e) {
          e.preventDefault();
          collapseCollection(section, {
            collectionBlocksContainer: collectionBlocksContainer,
            expandedView: expandedView,
            productsGrid: productsGrid
          });
        });
      }

      // Handle navigation arrows (desktop)
      if (navigationPrev) {
        navigationPrev.addEventListener('click', function(e) {
          e.preventDefault();
          if (!navigationPrev.disabled) {
            navigateToAdjacentCollection(collectionData, section, 'prev');
          }
        });
      }

      if (navigationNext) {
        navigationNext.addEventListener('click', function(e) {
          e.preventDefault();
          if (!navigationNext.disabled) {
            navigateToAdjacentCollection(collectionData, section, 'next');
          }
        });
      }

      // Handle mobile navigation arrows
      if (navigationMobilePrev) {
        navigationMobilePrev.addEventListener('click', function(e) {
          e.preventDefault();
          if (!navigationMobilePrev.disabled) {
            navigateToAdjacentCollection(collectionData, section, 'prev');
          }
        });
      }

      if (navigationMobileNext) {
        navigationMobileNext.addEventListener('click', function(e) {
          e.preventDefault();
          if (!navigationMobileNext.disabled) {
            navigateToAdjacentCollection(collectionData, section, 'next');
          }
        });
      }

      // Handle browser back/forward buttons
      window.addEventListener('popstate', function() {
        const currentIndex = getURLParameter(urlParamName);
        if (currentIndex === null && expandedView && expandedView.style.display !== 'none') {
          collapseCollection(section, {
            collectionBlocksContainer: collectionBlocksContainer,
            expandedView: expandedView,
            productsGrid: productsGrid
          });
        } else if (currentIndex !== null) {
          const index = parseInt(currentIndex, 10);
          if (!isNaN(index) && index >= 0 && index < collectionData.collection_blocks.length) {
            const activeCollection = collectionData.collection_blocks[index];
            if (activeCollection) {
              expandCollectionByData(activeCollection, collectionData, section, index, {
                collectionBlocksContainer: collectionBlocksContainer,
                expandedView: expandedView,
                navigationTitle: navigationTitle,
                navigationDescription: navigationDescription,
                navigationPrev: navigationPrev,
                navigationNext: navigationNext,
                navigationPrevText: navigationPrevText,
                navigationNextText: navigationNextText,
                productsGrid: productsGrid
              });
            }
          }
        }
      });
    });
  }

  // Expand collection view using collection data
  function expandCollectionByData(collection, collectionData, section, collectionIndex, elements) {
    // Use passed elements or query them if not provided
    const collectionBlocksContainer = elements && elements.collectionBlocksContainer 
      ? elements.collectionBlocksContainer 
      : section.querySelector('.collection-expandable-blocks');
    const expandedView = elements && elements.expandedView 
      ? elements.expandedView 
      : section.querySelector('.collection-expandable-expanded');
    const navigationTitle = elements && elements.navigationTitle 
      ? elements.navigationTitle 
      : section.querySelector('[data-collection-title]');
    const navigationDescription = elements && elements.navigationDescription 
      ? elements.navigationDescription 
      : section.querySelector('[data-collection-description]');
    const navigationPrev = elements && elements.navigationPrev 
      ? elements.navigationPrev 
      : section.querySelector('.collection-expandable-navigation-arrow--prev');
    const navigationNext = elements && elements.navigationNext 
      ? elements.navigationNext 
      : section.querySelector('.collection-expandable-navigation-arrow--next');
    const navigationPrevText = elements && elements.navigationPrevText 
      ? elements.navigationPrevText 
      : section.querySelector('[data-prev-collection-title]');
    const navigationNextText = elements && elements.navigationNextText 
      ? elements.navigationNextText 
      : section.querySelector('[data-next-collection-title]');
    const productsGrid = elements && elements.productsGrid 
      ? elements.productsGrid 
      : section.querySelector('.collection-expandable-products-grid');
    
    // Update URL with short parameter name and index
    setURLParameter('c', collectionIndex.toString());
    
    // Update navigation center - title and description
    if (navigationTitle) {
      const titleText = collection.title_collection || '';
      navigationTitle.textContent = titleText;
      // Ensure title is visible
      if (titleText.trim() !== '') {
        navigationTitle.style.display = 'block';
      } else {
        navigationTitle.style.display = 'none';
      }
    }
    
    if (navigationDescription) {
      const description = collection.description_collection || '';
      const hasHtmlTags = /<[^>]+>/.test(description);
      navigationDescription.innerHTML = hasHtmlTags
        ? description
        : (description.trim() !== '' ? `<p>${escapeHtml(description)}</p>` : '');

      // Show/hide description based on content
      if (description && description.trim() !== '' && description.trim() !== ' ') {
        navigationDescription.style.display = 'block';
      } else {
        navigationDescription.style.display = 'none';
      }
    }
    
    // Update navigation arrows (desktop and mobile)
    updateNavigationArrowsFromData(
      collectionData, 
      collectionIndex, 
      navigationPrev, 
      navigationNext, 
      navigationPrevText, 
      navigationNextText,
      elements && elements.navigationMobilePrev ? elements.navigationMobilePrev : null,
      elements && elements.navigationMobileNext ? elements.navigationMobileNext : null,
      elements && elements.navigationMobilePrevText ? elements.navigationMobilePrevText : null,
      elements && elements.navigationMobileNextText ? elements.navigationMobileNextText : null
    );
    
    // Hide collection blocks
    if (collectionBlocksContainer) {
      collectionBlocksContainer.style.display = 'none';
    }
    
    // Show expanded view
    if (expandedView) {
      expandedView.style.display = 'flex';
    }
    
    // Update grid columns based on settings
    updateProductsGridColumns(productsGrid);
    
    // Render product images
    renderProductImages(collection.images_product, productsGrid);
    
    // Scroll to top of section
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Update navigation arrows with adjacent collection info
  function updateNavigationArrowsFromData(collectionData, currentIndex, prevArrow, nextArrow, prevText, nextText, mobilePrevArrow, mobileNextArrow, mobilePrevText, mobileNextText) {
    const prevCollection = collectionData.collection_blocks[currentIndex - 1];
    const nextCollection = collectionData.collection_blocks[currentIndex + 1];
    
    // Helper function to update arrow and text
    function updateArrow(collection, arrow, text, mobileArrow, mobileText) {
      if (collection && arrow && text) {
        text.textContent = collection.title_collection || '';
        arrow.disabled = false;
      } else {
        if (text) text.textContent = '';
        if (arrow) arrow.disabled = true;
      }
      
      // Update mobile navigation if elements exist
      if (collection && mobileArrow && mobileText) {
        mobileText.textContent = collection.title_collection || '';
        mobileArrow.disabled = false;
      } else {
        if (mobileText) mobileText.textContent = '';
        if (mobileArrow) mobileArrow.disabled = true;
      }
    }
    
    // Previous collection
    updateArrow(prevCollection, prevArrow, prevText, mobilePrevArrow, mobilePrevText);
    
    // Next collection
    updateArrow(nextCollection, nextArrow, nextText, mobileNextArrow, mobileNextText);
  }

  // Navigate to adjacent collection
  function navigateToAdjacentCollection(collectionData, section, direction) {
    const currentIndexParam = getURLParameter('c');
    
    if (currentIndexParam === null) return;
    
    const currentIndex = parseInt(currentIndexParam, 10);
    if (isNaN(currentIndex) || currentIndex < 0 || currentIndex >= collectionData.collection_blocks.length) return;
    
    let targetIndex;
    if (direction === 'prev') {
      targetIndex = currentIndex - 1;
    } else {
      targetIndex = currentIndex + 1;
    }
    
    if (targetIndex < 0 || targetIndex >= collectionData.collection_blocks.length) return;
    
    const targetCollection = collectionData.collection_blocks[targetIndex];
    
    if (targetCollection) {
      // Get elements for this section
      const collectionBlocksContainer = section.querySelector('.collection-expandable-blocks');
      const expandedView = section.querySelector('.collection-expandable-expanded');
      const navigationTitle = section.querySelector('[data-collection-title]');
      const navigationDescription = section.querySelector('[data-collection-description]');
      const navigationPrev = section.querySelector('.collection-expandable-navigation-arrow--prev');
      const navigationNext = section.querySelector('.collection-expandable-navigation-arrow--next');
      const navigationPrevText = section.querySelector('[data-prev-collection-title]');
      const navigationNextText = section.querySelector('[data-next-collection-title]');
      const productsGrid = section.querySelector('.collection-expandable-products-grid');
      
      // Get mobile navigation elements
      const navigationMobile = section.querySelector('.collection-expandable-navigation-mobile');
      const navigationMobilePrev = navigationMobile ? navigationMobile.querySelector('.collection-expandable-navigation-arrow--prev') : null;
      const navigationMobileNext = navigationMobile ? navigationMobile.querySelector('.collection-expandable-navigation-arrow--next') : null;
      const navigationMobilePrevText = navigationMobile ? navigationMobile.querySelector('[data-prev-collection-title]') : null;
      const navigationMobileNextText = navigationMobile ? navigationMobile.querySelector('[data-next-collection-title]') : null;
      
      expandCollectionByData(targetCollection, collectionData, section, targetIndex, {
        collectionBlocksContainer: collectionBlocksContainer,
        expandedView: expandedView,
        navigationTitle: navigationTitle,
        navigationDescription: navigationDescription,
        navigationPrev: navigationPrev,
        navigationNext: navigationNext,
        navigationPrevText: navigationPrevText,
        navigationNextText: navigationNextText,
        navigationMobilePrev: navigationMobilePrev,
        navigationMobileNext: navigationMobileNext,
        navigationMobilePrevText: navigationMobilePrevText,
        navigationMobileNextText: navigationMobileNextText,
        productsGrid: productsGrid
      });
    }
  }

  // Collapse collection view
  function collapseCollection(section, elements) {
    // Use passed elements or query them if not provided
    const collectionBlocks = elements && elements.collectionBlocksContainer 
      ? elements.collectionBlocksContainer 
      : section.querySelector('.collection-expandable-blocks');
    const expandedView = elements && elements.expandedView 
      ? elements.expandedView 
      : section.querySelector('.collection-expandable-expanded');
    const productsGrid = elements && elements.productsGrid 
      ? elements.productsGrid 
      : section.querySelector('.collection-expandable-products-grid');
    
    // Remove URL parameter (short name 'c')
    setURLParameter('c', null);
    
    // Show collection blocks
    if (collectionBlocks) {
      collectionBlocks.style.display = 'grid';
    }
    
    // Hide expanded view
    if (expandedView) {
      expandedView.style.display = 'none';
    }
    
    // Clear products grid
    if (productsGrid) {
      productsGrid.innerHTML = '';
    }
    
    // Clear navigation title and description
    const navigationTitle = section.querySelector('[data-collection-title]');
    const navigationDescription = section.querySelector('[data-collection-description]');
    if (navigationTitle) {
      navigationTitle.textContent = '';
    }
    if (navigationDescription) {
      navigationDescription.textContent = '';
    }
  }

  // Render product images from array
  function renderProductImages(imagesArray, productsGrid) {
    if (!productsGrid) return;
    
    // Clear existing products
    productsGrid.innerHTML = '';
    
    if (!imagesArray || imagesArray.length === 0) {
      productsGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;">No products found in this collection.</div>';
      return;
    }
    
    // Create product items from images array
    imagesArray.forEach(function(imageData) {
      const imageUrl = typeof imageData === 'string'
        ? imageData
        : (imageData && (imageData.thumbnail_src || imageData.full_src || imageData.src));

      const fullImageUrl = typeof imageData === 'string'
        ? imageData
        : (imageData && (imageData.full_src || imageData.thumbnail_src || imageData.src));

      if (!imageUrl || !fullImageUrl) return;

      const imageWidth = parseInt(imageData && imageData.width, 10) || 800;
      const imageHeight = parseInt(imageData && imageData.height, 10) || 1000;
      const imageAlt = (imageData && imageData.alt) || '';

      const productItem = document.createElement('a');
      productItem.className = 'collection-expandable-product-item';
      productItem.href = fullImageUrl;
      productItem.setAttribute('data-main-media-link', '');
      productItem.setAttribute('data-pswp-width', String(imageWidth));
      productItem.setAttribute('data-pswp-height', String(imageHeight));
      productItem.setAttribute('target', '_blank');

      const productImg = document.createElement('img');
      productImg.src = imageUrl;
      productImg.alt = imageAlt;
      productImg.loading = 'lazy';
      productImg.width = imageWidth;
      productImg.height = imageHeight;

      productItem.appendChild(productImg);
      productsGrid.appendChild(productItem);
    });
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCollectionExpandable);
  } else {
    initCollectionExpandable();
  }
})();
