document.addEventListener('DOMContentLoaded', function () {
    // Initialize truncate functionality
    function initTruncate() {
      const truncatedElements = document.querySelectorAll('.editorial-two-column-text.truncated');

      truncatedElements.forEach(function (element) {
        const lines = parseInt(element.dataset.truncateLines) || 3;
        const blockId = element.dataset.blockId;
        const wrapper = element.parentElement;
        const readMoreLink = wrapper ? wrapper.querySelector(`[data-read-more-trigger="${blockId}"]`) : null;

        // Store original content if not already stored
        if (!element.dataset.originalContent) {
          element.dataset.originalContent = element.innerHTML;
        }

        // Set CSS variable for line-clamp
        element.style.setProperty('--truncate-lines', lines);

        // Temporarily remove truncate to measure full height
        element.classList.remove('is-truncated');
        element.innerHTML = element.dataset.originalContent;

        // Calculate line height
        const computedStyle = window.getComputedStyle(element);
        const lineHeight = parseFloat(computedStyle.lineHeight) || parseFloat(computedStyle.fontSize) * 1.7;
        const maxHeight = lineHeight * lines;
        const fullHeight = element.scrollHeight;

        // Check if content needs truncation
        if (fullHeight > maxHeight) {
          element.classList.add('is-truncated');
          
          setTimeout(function() {
            const rect = element.getBoundingClientRect();
            const lastLineTop = rect.top + (lines - 1) * lineHeight;
            const elementBottom = rect.bottom;
            
            element.style.wordBreak = 'normal';
            element.style.overflowWrap = 'normal';
          }, 0);

          if (readMoreLink) {
            // Get read more/less text from data attributes
            const readMoreText = readMoreLink.dataset.readMoreText || 'Read More';
            const readLessText = readMoreLink.dataset.readLessText || 'Read Less';
            
            // Remove existing event listeners by cloning
            const newReadMoreLink = readMoreLink.cloneNode(true);
            readMoreLink.parentNode.replaceChild(newReadMoreLink, readMoreLink);

            // Set initial state
            newReadMoreLink.textContent = readMoreText;
            newReadMoreLink.classList.remove('is-expanded');

            newReadMoreLink.addEventListener('click', function (e) {
              e.preventDefault();
              
              if (element.classList.contains('is-truncated')) {
                // Expand content
                element.classList.remove('is-truncated');
                element.innerHTML = element.dataset.originalContent;
                newReadMoreLink.textContent = readLessText;
                newReadMoreLink.classList.add('is-expanded');
              } else {
                // Collapse content
                element.classList.add('is-truncated');
                newReadMoreLink.textContent = readMoreText;
                newReadMoreLink.classList.remove('is-expanded');
              }
            });
          }
        } else {
          element.classList.remove('is-truncated');
          if (readMoreLink) {
            readMoreLink.style.display = 'none';
          }
        }
      });
    }

    // Initialize on load
    initTruncate();

    // Re-initialize on resize (for responsive changes)
    let resizeTimeout;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function () {
        initTruncate();
      }, 250);
    });
  });