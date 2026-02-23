/**
 * Newsfeed Burner - Content Script
 * Injects feed-blocking CSS and reacts to procrastination state changes.
 * Runs at document_start on Facebook, YouTube, and LinkedIn.
 */

(function () {
  'use strict';

  const STYLE_ID = 'newsfeed-burner-css';

  // --- Site Detection ---

  const host = location.hostname;
  const isFacebook = host.includes('facebook.com');
  const isYouTube = host.includes('youtube.com');
  const isLinkedIn = host.includes('linkedin.com');

  if (!isFacebook && !isYouTube && !isLinkedIn) return;

  // --- CSS Rules per Site ---

  function getFeedCSS() {
    if (isFacebook) {
      return `
        /* ---- Facebook Newsfeed ---- */

        /* Main feed at facebook.com/ */
        [role="feed"] {
          display: none !important;
        }

        /* Stories bar */
        [data-pagelet="Stories"] {
          display: none !important;
        }

        /* Feed unit containers */
        [data-pagelet^="FeedUnit"] {
          display: none !important;
        }

        /* Reels bar on home */
        [data-pagelet="ReelsViewer"] {
          display: none !important;
        }

        /* "Suggested for you" sections */
        [data-pagelet="rising_groups_feed"] {
          display: none !important;
        }

        /* Right-rail sponsored / people you may know */
        [data-pagelet="RightRail"] {
          display: none !important;
        }
      `;
    }

    if (isYouTube) {
      return `
        /* ---- YouTube Home Feed ---- */

        /* Home page recommendation grid */
        ytd-browse[page-subtype="home"] ytd-rich-grid-renderer {
          display: none !important;
        }

        /* Home page: hide the whole primary content area when feed is the only thing */
        ytd-browse[page-subtype="home"] #primary {
          display: none !important;
        }

        /* Shorts shelf on home / subscriptions */
        ytd-rich-section-renderer {
          display: none !important;
        }

        /* Shorts tab page */
        ytd-browse[page-subtype="shorts"] {
          display: none !important;
        }

        /* Trending / Explore feed */
        ytd-browse[page-subtype="trending"] #contents {
          display: none !important;
        }

        /* Watch page: sidebar recommendations */
        #secondary ytd-watch-next-secondary-results-renderer {
          display: none !important;
        }

        /* Home page chips / category pills (useless without feed) */
        ytd-browse[page-subtype="home"] #chip-bar {
          display: none !important;
        }
      `;
    }

    if (isLinkedIn) {
      return `
        /* ---- LinkedIn Feed ---- */

        /* Main feed scroll container */
        .scaffold-finite-scroll__content {
          display: none !important;
        }

        /* Feed items (shared updates) */
        .feed-shared-update-v2 {
          display: none !important;
        }

        /* "Add to feed" / follow suggestions */
        .feed-following-feed {
          display: none !important;
        }

        /* Right rail news module */
        .news-module {
          display: none !important;
        }

        /* "People you may know" sidebar card */
        .pymk-flyout {
          display: none !important;
        }

        /* Promoted posts / ads in feed */
        [data-view-name="feed-ad-unit"] {
          display: none !important;
        }

        /* LinkedIn notifications feed */
        .nt-feed-manager-container .scaffold-finite-scroll__content {
          display: none !important;
        }

        /* Main feed wrapper at /feed/ */
        .feed-s-content-highlight-linkedin,
        [data-finite-scroll-hotkey-context] {
          display: none !important;
        }
      `;
    }

    return '';
  }

  // --- Style Injection ---

  function injectBlocker() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = getFeedCSS();
    const target = document.head || document.documentElement;
    target.appendChild(style);
  }

  function removeBlocker() {
    const style = document.getElementById(STYLE_ID);
    if (style) style.remove();
  }

  // --- State Check ---

  function applyState(blocking) {
    if (blocking) {
      injectBlocker();
    } else {
      removeBlocker();
    }
  }

  // Inject immediately (document_start) to prevent flash of feed content
  injectBlocker();

  // Then check actual procrastination state
  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
    if (chrome.runtime.lastError) return;
    if (response && response.procrastinating) {
      removeBlocker(); // Procrastination is active — show feed
    }
    // else: keep blocker active (already injected above)
  });

  // --- Listen for State Changes ---

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'STATE_CHANGED') {
      applyState(msg.blocking);
    }
  });

  // --- MutationObserver: Re-apply on Dynamic DOM Changes ---
  // SPAs like YouTube swap content without a full page load.

  let observerTimer = null;

  const observer = new MutationObserver(() => {
    const blocker = document.getElementById(STYLE_ID);
    if (blocker) return; // Still present, nothing to do

    // Style was removed by the page (unlikely but defensive)
    clearTimeout(observerTimer);
    observerTimer = setTimeout(() => {
      chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
        if (chrome.runtime.lastError) return;
        if (!response || !response.procrastinating) {
          injectBlocker();
        }
      });
    }, 100);
  });

  // Start observing once the head/body is available
  function startObserver() {
    const target = document.head || document.body || document.documentElement;
    if (target) {
      observer.observe(target, { childList: true, subtree: false });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver, { once: true });
  } else {
    startObserver();
  }

})();
