/**
 * Newsfeed Burner - Content Script
 * Injects feed-blocking CSS and reacts to procrastination state changes.
 * Runs at document_start on Facebook, YouTube, LinkedIn, Instagram, X, Reddit, TikTok.
 */

(function () {
  'use strict';

  const STYLE_ID          = 'newsfeed-burner-css';
  const PLACEHOLDER_CLASS = 'nfb-placeholder';
  const BANNER_ID         = 'nfb-banner';

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

  // Returns true when the entire page should be replaced with a full-screen
  // "Disabled" overlay — used for Instagram Reels and YouTube Shorts pages.
  function isFullPageBlock() {
    const path = location.pathname.replace(/\/+$/, '') || '/';
    if (isInstagram) return path === '/reels' || path.startsWith('/reels/');
    if (isYouTube)   return path === '/shorts' || path.startsWith('/shorts/');
    return false;
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
      if (isFullPageBlock()) {
        // On /shorts/ — keep the video visible, only hide the between-video
        // navigation so the user can watch but not doomscroll.
        return `
          /* ---- YouTube Shorts scroll-lock ---- */
          ytd-shorts #navigation-container {
            display: none !important;
          }
        `;
      }

      return `
        /* ---- YouTube Home Feed ---- */

        ytd-browse[page-subtype="home"] ytd-rich-grid-renderer {
          display: none !important;
        }

        ytd-browse[page-subtype="home"] #primary {
          display: none !important;
        }

        /* Shorts shelves inside home / subscriptions feed */
        ytd-rich-section-renderer {
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
      if (isFullPageBlock()) {
        // On /reels/ — keep the video visible, only hide the between-reel
        // navigation arrows so the user can watch but not doomscroll.
        return `
          /* ---- Instagram Reels scroll-lock ---- */
          [aria-label="Next"],
          [aria-label="Previous"],
          [aria-label*="next" i][role="button"],
          [aria-label*="previous" i][role="button"] {
            display: none !important;
          }
        `;
      }

      return `
        /* ---- Instagram Home Feed ---- */

        [role="feed"] {
          display: none !important;
        }

        /* Belt-and-suspenders: also hide articles directly.
         * Prevents the 1-frame scroll flash where Instagram inserts a new
         * article before the parent [role="feed"] display:none propagates. */
        main article {
          display: none !important;
          animation: none !important;
          transition: none !important;
        }

        [aria-label="Stories"] {
          display: none !important;
        }

        /* Reels shelf / carousel on home */
        [aria-label="Reels"] {
          display: none !important;
        }

        [aria-label="Suggested posts"] {
          display: none !important;
        }

        /* Loading spinner — hide so the page stops visually "trying" */
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
    if (!isBlockedPage()) {
      console.debug('[NFB] injectBlocker skipped — not a blocked page:', location.pathname);
      return;
    }
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = getFeedCSS();
    (document.head || document.documentElement).appendChild(style);
    console.debug('[NFB] CSS injected — fullPageBlock:', isFullPageBlock());
  }

  function removeBlocker() {
    const style = document.getElementById(STYLE_ID);
    if (style) style.remove();
    removePlaceholder();
    removeBanner();
    clearScrollLock();
    clearFeedGuard();
    console.debug('[NFB] blocker removed');
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

  // --- Scroll Lock (Reels / Shorts) ---
  // Prevents advancing to the next video via wheel/touch/keyboard while
  // still letting the user watch the current one.

  let scrollLockHandlers = null;

  function setupScrollLock() {
    if (!isFullPageBlock() || scrollLockHandlers) return;

    const stopScroll = (e) => {
      e.stopImmediatePropagation();
      e.preventDefault();
    };

    const stopKeys = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    };

    window.addEventListener('wheel',     stopScroll, { capture: true, passive: false });
    window.addEventListener('touchmove', stopScroll, { capture: true, passive: false });
    window.addEventListener('keydown',   stopKeys,   { capture: true });

    scrollLockHandlers = { stopScroll, stopKeys };
    console.debug('[NFB] scroll lock engaged on', location.pathname);
  }

  function clearScrollLock() {
    if (!scrollLockHandlers) return;
    const { stopScroll, stopKeys } = scrollLockHandlers;
    window.removeEventListener('wheel',     stopScroll, { capture: true });
    window.removeEventListener('touchmove', stopScroll, { capture: true });
    window.removeEventListener('keydown',   stopKeys,   { capture: true });
    scrollLockHandlers = null;
    console.debug('[NFB] scroll lock cleared');
  }

  // --- Scroll-lock Banner ---
  // A small floating pill shown on Reels/Shorts to indicate scroll is locked.

  function ensureBanner() {
    if (!isFullPageBlock()) return;
    if (!document.body || document.getElementById(BANNER_ID)) return;

    const banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.style.cssText = [
      'position: fixed',
      'bottom: 24px',
      'left: 50%',
      'transform: translateX(-50%)',
      'background: #fff',
      'color: #666',
      'border-radius: 20px',
      'padding: 8px 18px',
      'font-size: 12px',
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      'z-index: 2147483647',
      'box-shadow: 0 2px 14px rgba(0,0,0,0.18)',
      'white-space: nowrap',
      'pointer-events: none',
    ].join(';');
    banner.textContent = '🔥 Scrolling disabled by Newsfeed Burner.';
    document.body.appendChild(banner);
    console.debug('[NFB] banner inserted on', location.pathname);
  }

  function removeBanner() {
    const el = document.getElementById(BANNER_ID);
    if (el) el.remove();
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

  // --- SPA Navigation (Facebook, X/Twitter, YouTube, Instagram) ---
  //
  // All four are SPAs — pushState navigation doesn't reload the content
  // script, so we intercept history changes to toggle blocking per page.

  if (isFacebook || isTwitter || isYouTube || isInstagram) {
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
    console.debug('[NFB] SPA navigate → path:', location.pathname,
      '| blockedPage:', isBlockedPage(), '| fullPageBlock:', isFullPageBlock());

    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
      if (chrome.runtime.lastError) return;
      const blocking = !response || !response.procrastinating;

      // Always clear previous page state first (scroll-lock ↔ placeholder ↔
      // nothing can differ across pages, e.g. home → /reels/ → home)
      removeBlocker();

      if (blocking && isBlockedPage()) {
        injectBlocker();
        schedulePostDomWork();
      }
    });
  }

  // --- Deferred post-DOM work (placeholder + guard, after elements exist) ---

  let postDomTimer = null;

  function schedulePostDomWork() {
    clearTimeout(postDomTimer);
    let attempts = 0;
    function attempt() {
      if (isFullPageBlock()) {
        // Reels / Shorts — allow viewing, disable scroll between videos
        ensureBanner();
        setupScrollLock();
      } else {
        // Home feed — insert footnote next to hidden feed + guard against reload
        ensurePlaceholder();
        setupFeedGuard();
      }
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

  console.debug('[NFB] init — host:', host, '| path:', location.pathname,
    '| blockedPage:', isBlockedPage(), '| fullPageBlock:', isFullPageBlock());

  injectBlocker(); // Immediate — prevents flash of feed content

  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
    if (chrome.runtime.lastError) {
      console.debug('[NFB] GET_STATE error:', chrome.runtime.lastError.message);
      return;
    }
    console.debug('[NFB] state:', response);
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
            if (isFullPageBlock()) {
              ensureBanner();
              setupScrollLock();
            } else {
              ensurePlaceholder();
            }
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
