/**
 * Newsfeed Burner - Content Script
 * Injects feed-blocking CSS and reacts to procrastination state changes.
 * Runs at document_start on Facebook, YouTube, LinkedIn, Instagram, X, Reddit, TikTok.
 */

(function () {
  'use strict';

  const STYLE_ID          = 'newsfeed-burner-css';
  const PLACEHOLDER_CLASS = 'nfb-placeholder';

  // --- Site Detection ---

  const host        = location.hostname;
  const isFacebook  = host.includes('facebook.com');
  const isYouTube   = host.includes('youtube.com');
  const isLinkedIn  = host.includes('linkedin.com');
  const isInstagram = host.includes('instagram.com');
  const isTwitter   = host.includes('x.com') || host.includes('twitter.com');
  const isReddit    = host.includes('reddit.com');
  const isTikTok    = host.includes('tiktok.com');

  if (!isFacebook && !isYouTube && !isLinkedIn &&
      !isInstagram && !isTwitter && !isReddit && !isTikTok) return;

  // --- Page-level restriction ---
  // Facebook: home (/) and reels only — not Groups, Marketplace, Events, etc.
  // X/Twitter: home and explore only — not profiles, DMs, notifications, etc.

  function isBlockedPage() {
    const path = location.pathname.replace(/\/+$/, '') || '/';

    if (isFacebook) {
      return path === '' || path === '/' || path === '/reels' || path.startsWith('/reels/');
    }

    if (isTwitter) {
      return path === '' || path === '/' || path === '/home' || path === '/explore';
    }

    return true;
  }

  // --- CSS Rules per Site ---

  function getFeedCSS() {
    if (isFacebook) {
      return `
        /* ---- Facebook Newsfeed ---- */

        /*
         * Exact feed container class combo (inspect-verified).
         * data-pagelet selectors act as stable fallbacks.
         */
        .x78zum5.x1q0g3np.xl56j7k {
          display: none !important;
        }

        /* Stable: main feed pagelet wrapper */
        [data-pagelet="MainFeed"],
        [data-pagelet^="FeedUnit"] {
          display: none !important;
        }

        /* ARIA fallback (groups, watch, etc.) */
        [role="feed"] {
          display: none !important;
        }

        /* Stories / Reels bar at the top of home */
        [data-pagelet="TopOfHome"],
        [data-pagelet="Stories"],
        [data-pagelet="WatchStoriesViewer"],
        [data-pagelet^="rhc_reels"],
        [aria-label="Stories"] {
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

        ytd-browse[page-subtype="home"] ytd-rich-grid-renderer {
          display: none !important;
        }

        ytd-browse[page-subtype="home"] #primary {
          display: none !important;
        }

        ytd-rich-section-renderer {
          display: none !important;
        }

        ytd-browse[page-subtype="shorts"] {
          display: none !important;
        }

        ytd-browse[page-subtype="trending"] #contents {
          display: none !important;
        }

        #secondary ytd-watch-next-secondary-results-renderer {
          display: none !important;
        }

        ytd-browse[page-subtype="home"] #chip-bar {
          display: none !important;
        }
      `;
    }

    if (isLinkedIn) {
      return `
        /* ---- LinkedIn Feed ---- */

        /*
         * Exact feed container class combo (inspect-verified).
         * Attribute/structural selectors below are stable fallbacks.
         */
        ._4062c218.b3b1c987._98c731d9._3f7f64c2.e2718449._4a745388 {
          display: none !important;
        }

        main > div.relative > .scaffold-finite-scroll,
        .scaffold-finite-scroll__content,
        .scaffold-finite-scroll {
          display: none !important;
        }

        [componentkey^="container-update-list_mainFeed"] {
          display: none !important;
        }

        [aria-label^="Main Feed"] {
          display: none !important;
        }

        .feed-shared-update-v2,
        .occludable-update,
        [data-id*="urn:li:activity"],
        [data-chameleon-result-urn*="update"],
        [data-view-name="feed-full-update"],
        [data-view-name="feed-ad-unit"] {
          display: none !important;
        }

        #feed-news-module,
        .news-module {
          display: none !important;
        }

        .pymk-flyout {
          display: none !important;
        }
      `;
    }

    if (isInstagram) {
      return `
        /* ---- Instagram Feed ---- */

        [role="feed"] {
          display: none !important;
        }

        [aria-label="Stories"] {
          display: none !important;
        }

        [aria-label="Reels"] {
          display: none !important;
        }

        [aria-label="Suggested posts"] {
          display: none !important;
        }

        main article {
          display: none !important;
        }

        /*
         * Loading spinner — hide so the page stops visually "trying".
         * Instagram keeps polling when it thinks content hasn't loaded.
         */
        [data-testid="loading"],
        [aria-label="Loading..."],
        [role="progressbar"],
        svg[aria-label="Loading"] {
          display: none !important;
        }
      `;
    }

    if (isTwitter) {
      return `
        /* ---- X / Twitter Feed (home + explore only) ---- */

        /* Home timeline */
        [aria-label="Home timeline"],
        [aria-label="Timeline: Your Home Timeline"] {
          display: none !important;
        }

        /* "For You" / "Following" cells */
        [data-testid="primaryColumn"] [data-testid="cellInnerDiv"] {
          display: none !important;
        }

        /* Trending / What's happening sidebar */
        [aria-label="Timeline: Trending now"],
        [data-testid="sidebarColumn"] [data-testid="trend"] {
          display: none !important;
        }

        /* Explore page feed */
        [data-testid="primaryColumn"] section {
          display: none !important;
        }

        /* "Who to follow" sidebar */
        [data-testid="UserCell"] {
          display: none !important;
        }
      `;
    }

    if (isReddit) {
      return `
        /* ---- Reddit Feed ---- */

        shreddit-feed {
          display: none !important;
        }

        shreddit-post {
          display: none !important;
        }

        shreddit-trending-searches,
        [data-testid="trending-carousel"] {
          display: none !important;
        }

        /* Old Reddit */
        #siteTable,
        .listings {
          display: none !important;
        }
      `;
    }

    if (isTikTok) {
      return `
        /* ---- TikTok Feed ---- */

        [data-e2e="recommend-list-item-container"],
        [data-e2e="home-item-list"] {
          display: none !important;
        }

        [data-e2e="follow-item-list"] {
          display: none !important;
        }

        [data-e2e="video-card-container"],
        [data-e2e="video-desc"] {
          display: none !important;
        }

        [class*="DivVideoFeed"],
        [class*="DivBigFeedCard"] {
          display: none !important;
        }
      `;
    }

    return '';
  }

  // --- Style Injection ---

  function injectBlocker() {
    if (!isBlockedPage()) return;
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = getFeedCSS();
    (document.head || document.documentElement).appendChild(style);
  }

  function removeBlocker() {
    const style = document.getElementById(STYLE_ID);
    if (style) style.remove();
    removePlaceholder();
    clearFeedGuard();
  }

  function applyState(blocking) {
    if (blocking) {
      injectBlocker();
      schedulePostDomWork();
    } else {
      removeBlocker();
    }
  }

  // --- Placeholder ---

  // Returns the first selector that has a matching element on the page.
  function getMainFeedSelectors() {
    if (isFacebook)  return [
      '[data-pagelet="MainFeed"]',
      '.x78zum5.x1q0g3np.xl56j7k',
      '[role="feed"]',
    ];
    if (isYouTube)   return [
      'ytd-browse[page-subtype="home"] ytd-rich-grid-renderer',
    ];
    if (isLinkedIn)  return [
      '._4062c218.b3b1c987._98c731d9._3f7f64c2.e2718449._4a745388',
      '[componentkey^="container-update-list_mainFeed"]',
      '[aria-label^="Main Feed"]',
      '.scaffold-finite-scroll',
    ];
    if (isInstagram) return [
      '[role="feed"]',
    ];
    if (isTwitter)   return [
      '[aria-label="Home timeline"]',
      '[aria-label="Timeline: Your Home Timeline"]',
    ];
    if (isReddit)    return [
      'shreddit-feed',
      '#siteTable',
    ];
    if (isTikTok)    return [
      '[data-e2e="home-item-list"]',
      '[data-e2e="recommend-list-item-container"]',
    ];
    return [];
  }

  function ensurePlaceholder() {
    if (!isBlockedPage()) return;
    if (document.querySelector('.' + PLACEHOLDER_CLASS)) return;

    for (const sel of getMainFeedSelectors()) {
      const el = document.querySelector(sel);
      if (el && el.parentNode) {
        const note = document.createElement('p');
        note.className = PLACEHOLDER_CLASS;
        note.textContent = '🔥 Removed by Newsfeed Burner.';
        note.style.cssText = [
          'all: initial',
          'display: block !important',
          'text-align: center',
          'padding: 20px 16px',
          'color: #bbb',
          'font-size: 12px',
          'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          'letter-spacing: 0.2px',
        ].join(';');
        el.parentNode.insertBefore(note, el);
        return;
      }
    }
  }

  function removePlaceholder() {
    document.querySelectorAll('.' + PLACEHOLDER_CLASS).forEach(el => el.remove());
  }

  // --- Feed Guard (CPU drain prevention) ---
  //
  // Problem: when the feed has display:none, the page height collapses.
  // Sites using scroll-position-based infinite loading see
  // scrollY ≈ scrollHeight and fire load-more requests in a tight loop.
  //
  // Fix: watch the hidden feed container and immediately remove any child
  // nodes the site injects, so the loading loop has nothing to act on.
  // We also clamp how fast it can fire using a cooldown flag.

  let feedGuard    = null;
  let guardCooling = false;

  function setupFeedGuard() {
    if (!isBlockedPage() || feedGuard) return;

    for (const sel of getMainFeedSelectors()) {
      const el = document.querySelector(sel);
      if (!el) continue;

      feedGuard = new MutationObserver((mutations) => {
        if (guardCooling) return;
        guardCooling = true;
        setTimeout(() => { guardCooling = false; }, 400);

        for (const m of mutations) {
          for (const node of m.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              node.remove();
            }
          }
        }
      });

      feedGuard.observe(el, { childList: true });
      break;
    }
  }

  function clearFeedGuard() {
    if (feedGuard) {
      feedGuard.disconnect();
      feedGuard = null;
    }
    guardCooling = false;
  }

  // --- SPA Navigation (Facebook + X/Twitter) ---
  //
  // Both sites are SPAs — pushState navigation doesn't reload the content
  // script, so we intercept history changes to toggle blocking per page.

  if (isFacebook || isTwitter) {
    const _push    = history.pushState.bind(history);
    const _replace = history.replaceState.bind(history);

    history.pushState = function (...args) {
      _push(...args);
      onSpaNavigate();
    };
    history.replaceState = function (...args) {
      _replace(...args);
      onSpaNavigate();
    };
    window.addEventListener('popstate', onSpaNavigate);
  }

  function onSpaNavigate() {
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
      if (chrome.runtime.lastError) return;
      const blocking = !response || !response.procrastinating;

      if (blocking && isBlockedPage()) {
        injectBlocker();
        schedulePostDomWork();
      } else {
        removeBlocker();
      }
    });
  }

  // --- Deferred post-DOM work (placeholder + guard, after elements exist) ---

  let postDomTimer = null;

  function schedulePostDomWork() {
    clearTimeout(postDomTimer);
    // Retry a few times to handle late-loading SPAs
    let attempts = 0;
    function attempt() {
      ensurePlaceholder();
      setupFeedGuard();
      if (++attempts < 6) {
        postDomTimer = setTimeout(attempt, 500);
      }
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', attempt, { once: true });
    } else {
      attempt();
    }
  }

  // --- Init ---

  injectBlocker(); // Immediate — prevents flash of feed content

  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
    if (chrome.runtime.lastError) return;
    if (response && response.procrastinating) {
      removeBlocker();
    } else {
      schedulePostDomWork();
    }
  });

  // --- Message Listener ---

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'STATE_CHANGED') {
      applyState(msg.blocking);
    }
  });

  // --- MutationObserver: re-inject style if SPA clears <head> ---

  let styleObserverTimer = null;

  const styleObserver = new MutationObserver(() => {
    if (!document.getElementById(STYLE_ID)) {
      clearTimeout(styleObserverTimer);
      styleObserverTimer = setTimeout(() => {
        chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
          if (chrome.runtime.lastError) return;
          if (!response || !response.procrastinating) {
            injectBlocker();
            ensurePlaceholder();
          }
        });
      }, 80);
    }
  });

  function startStyleObserver() {
    const head = document.head || document.documentElement;
    styleObserver.observe(head, { childList: true, subtree: false });
    if (document.body) {
      styleObserver.observe(document.body, { childList: true, subtree: false });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startStyleObserver, { once: true });
  } else {
    startStyleObserver();
  }

})();
