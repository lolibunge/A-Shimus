(function() {
    'use strict';
    
    function initCollectionShowcase() {
      // Find all collection showcase sections on the page
      const showcaseSections = document.querySelectorAll('.collection-showcase[data-section-id]');
      
      showcaseSections.forEach(function(sectionEl) {
        const sectionId = sectionEl.dataset.sectionId;
        if (!sectionId) return;
        
        const swiperEl = document.getElementById('products-swiper-' + sectionId);
        const secondaryImageEl = document.getElementById('secondary-image-' + sectionId);
        
        if (!swiperEl || !secondaryImageEl) return;
        
        // Check if already initialized
        if (swiperEl.swiper) return;
    
        function updateSecondaryImage(slide) {
          if (!slide || !secondaryImageEl) return;
          
          const secondImageUrl = slide.dataset.secondImageProduct;
          const secondImageAlt = slide.dataset.secondImageAlt || '';
          const featuredImageUrl = slide.dataset.featuredImageProduct;
          const featuredImageAlt = slide.dataset.featuredImageAlt || '';
          
          if (secondImageUrl) {
            secondaryImageEl.innerHTML = '<img src="' + secondImageUrl + '" alt="' + secondImageAlt + '" width="800" height="1067" loading="lazy">';
          } else if (featuredImageUrl) {
            secondaryImageEl.innerHTML = '<img src="' + featuredImageUrl + '" alt="' + featuredImageAlt + '" width="800" height="1067" loading="lazy">';
          } else {
            secondaryImageEl.innerHTML = '<div class="empty">No image available</div>';
          }
        }
        
        function initSwiper() {
          if (typeof Swiper === 'undefined') {
            setTimeout(initSwiper, 100);
            return;
          }
          
          const prevBtn = document.getElementById('nav-prev-' + sectionId);
          const nextBtn = document.getElementById('nav-next-' + sectionId);
          const paginationEl = document.getElementById('pagination-' + sectionId);
          const isThumbnails = paginationEl && paginationEl.classList.contains('collection-showcase-pagination--thumbnails');
          const paginationItems = isThumbnails ? document.querySelectorAll('#pagination-' + sectionId + ' .collection-showcase-pagination-item') : [];
          
          // Get configuration from data attributes
          const slidesPerViewMobile = parseFloat(swiperEl.dataset.slidesPerViewMobile) || 1;
          const slidesPerViewTablet = parseFloat(swiperEl.dataset.slidesPerViewTablet) || 1;
          const slidesPerViewDesktop = parseFloat(swiperEl.dataset.slidesPerViewDesktop) || 1;
          const spaceBetweenMobile = parseFloat(swiperEl.dataset.spaceBetweenMobile) || 0;
          const spaceBetweenTablet = parseFloat(swiperEl.dataset.spaceBetweenTablet) || 0;
          const spaceBetweenDesktop = parseFloat(swiperEl.dataset.spaceBetweenDesktop) || 0;
          
          const swiper = new Swiper(swiperEl, {
            slidesPerView: slidesPerViewMobile,
            spaceBetween: spaceBetweenMobile,
            centeredSlides: true,
            loop: false,
            navigation: {
              nextEl: nextBtn || null,
              prevEl: prevBtn || null,
            },
            pagination: isThumbnails ? false : {
              el: paginationEl || null,
              type: 'bullets',
              clickable: true,
            },
            breakpoints: {
              768: {
                slidesPerView: slidesPerViewTablet,
                spaceBetween: spaceBetweenTablet,
                centeredSlides: true,
              },
              1024: {
                slidesPerView: slidesPerViewDesktop,
                spaceBetween: spaceBetweenDesktop,
                centeredSlides: true,
              }
            },
            on: {
              init: function(swiperInstance) {
                const activeSlide = swiperInstance.slides[swiperInstance.activeIndex];
                updateSecondaryImage(activeSlide);
                
                if (isThumbnails) {
                  // Update thumbnail pagination active state
                  paginationItems.forEach(function(item, index) {
                    if (index === swiperInstance.activeIndex) {
                      item.classList.add('active');
                    } else {
                      item.classList.remove('active');
                    }
                  });
                }
              },
              slideChange: function(swiperInstance) {
                const activeSlide = swiperInstance.slides[swiperInstance.activeIndex];
                updateSecondaryImage(activeSlide);
                
                if (isThumbnails) {
                  // Update thumbnail pagination active state
                  paginationItems.forEach(function(item, index) {
                    if (index === swiperInstance.activeIndex) {
                      item.classList.add('active');
                    } else {
                      item.classList.remove('active');
                    }
                  });
                }
              }
            }
          });
          
          // Thumbnail pagination click handlers
          if (isThumbnails && paginationItems.length > 0) {
            paginationItems.forEach(function(item, index) {
              item.addEventListener('click', function(e) {
                e.preventDefault();
                swiper.slideTo(index);
              });
            });
          }
        }
        
        initSwiper();
      });
    }
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        setTimeout(initCollectionShowcase, 500);
      });
    } else {
      setTimeout(initCollectionShowcase, 500);
    }
  })();