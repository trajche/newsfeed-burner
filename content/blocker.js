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
  // Facebook : home (/) and /reels only — not Groups, Marketplace, Events, etc.
  // X/Twitter: home and /explore only — not profiles, DMs, notifications, etc.
  // Reddit   : feed listing pages only — not individual threads (/comments/)

  function isBlockedPage() {
    const path = location.pathname.replace(/\/+$/, '') || '/';

    if (isFacebook) {
      // /reel/ID  = individual reel (scroll-lock)
      // /reels/   = reels tab (scroll-lock)
      // /         = home feed (blocked)
      return path === '' || path === '/'
          || path === '/reels'  || path.startsWith('/reels/')
          || path === '/reel'   || path.startsWith('/reel/');
    }

    if (isTwitter) {
      return path === '' || path === '/' || path === '/home' || path === '/explore';
    }

    if (isReddit) {
      // Let users read threads and visit profiles; only block listing feeds
      if (path.includes('/comments/')) return false;
      if (path.startsWith('/user/'))    return false;
      return true;
    }

    return true;
  }

  // Returns true when the entire page should be replaced with a full-screen
  // "Disabled" overlay — used for Instagram Reels and YouTube Shorts pages.
  function isFullPageBlock() {
    const path = location.pathname.replace(/\/+$/, '') || '/';
    if (isInstagram) return path === '/reels' || path.startsWith('/reels/');
    if (isYouTube)   return path === '/shorts' || path.startsWith('/shorts/');
    if (isFacebook)  return path === '/reels'  || path.startsWith('/reels/')
                         || path === '/reel'   || path.startsWith('/reel/');
    return false;
  }

  // --- CSS Rules per Site ---

  function getFeedCSS() {
    if (isFacebook) {
      if (isFullPageBlock()) {
        return `
          /* ---- Facebook Reels scroll-lock ---- */
          * {
            scroll-snap-type: none !important;
            scroll-snap-align: none !important;
          }
          [data-pagelet="ReelsViewer"],
          [data-pagelet^="rhc_reels"],
          [role="main"] > div {
            overflow: hidden !important;
            touch-action: none !important;
          }
        `;
      }

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
    } // end isFacebook

    if (isYouTube) {
      if (isFullPageBlock()) {
        return `
          /* ---- YouTube Shorts scroll-lock ---- */

          /* Hide between-video navigation arrows (both selector and class) */
          ytd-shorts #navigation-container,
          .navigation-container.ytd-shorts {
            display: none !important;
          }

          /* Kill CSS scroll-snap so the container can't snap to the next short */
          * {
            scroll-snap-type: none !important;
            scroll-snap-align: none !important;
          }

          /* Prevent touch/pointer gestures at the CSS level */
          ytd-shorts,
          ytd-reel-video-renderer,
          #shorts-container {
            overflow: hidden !important;
            touch-action: none !important;
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
        return `
          /* ---- Instagram Reels scroll-lock ---- */

          /* Hide between-reel navigation buttons */
          [aria-label="Next"],
          [aria-label="Previous"],
          [aria-label*="next" i][role="button"],
          [aria-label*="previous" i][role="button"] {
            display: none !important;
          }

          /* Kill CSS scroll-snap so the container can't snap to the next reel */
          * {
            scroll-snap-type: none !important;
            scroll-snap-align: none !important;
          }

          /* Prevent touch/pointer gestures at the CSS level.
             Instagram uses a scroll-snap div inside main > section. */
          main section,
          main section > div,
          main > div {
            overflow: hidden !important;
            touch-action: none !important;
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
  // Prevents advancing to the next video via wheel/touch/keyboard/pointer
  // while still letting the user watch the current one.
  //
  // Three-layer approach:
  //   1. CSS: disables scroll-snap and sets overflow:hidden on containers
  //   2. JS events: stops wheel/touch/pointer in capture phase on both
  //      window and document so the site's handlers never fire
  //   3. DOM scan: finds computed-scrollable elements and freezes them

  let scrollLockHandlers = null;
  let frozenElements     = []; // tracks inline-style changes made by freezeScrollContainers

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

    const opts      = { capture: true, passive: false };
    const optsNoP   = { capture: true };
    const targets   = [window, document];

    targets.forEach(t => {
      t.addEventListener('wheel',        stopScroll, opts);
      t.addEventListener('touchstart',   stopScroll, opts);
      t.addEventListener('touchmove',    stopScroll, opts);
    });
    window.addEventListener('keydown', stopKeys, optsNoP);

    scrollLockHandlers = { stopScroll, stopKeys };
    console.debug('[NFB] scroll lock engaged on', location.pathname);

    // Layer 3: freeze any computed-scrollable element in the visible tree
    freezeScrollContainers();
  }

  // Walk the DOM (limited depth) to find elements the browser considers
  // scrollable and forcibly set overflow:hidden on them.
  // Saves original inline values so thawScrollContainers() can restore them.
  function freezeScrollContainers() {
    const root = document.querySelector('main') || document.querySelector('body');
    if (!root) return;

    const seen = new Set();
    function walk(el, depth) {
      if (depth > 8 || seen.has(el)) return;
      seen.add(el);

      const cs   = window.getComputedStyle(el);
      const oy   = cs.overflowY;
      const snap = cs.scrollSnapType;

      if ((oy === 'scroll' || oy === 'auto') &&
          el !== document.body && el !== document.documentElement) {
        // Save whatever inline values were set before we touch them
        frozenElements.push({
          el,
          overflow:       el.style.overflow       || null,
          overflowY:      el.style.overflowY      || null,
          scrollSnapType: el.style.scrollSnapType || null,
        });
        el.style.setProperty('overflow',   'hidden', 'important');
        el.style.setProperty('overflow-y', 'hidden', 'important');
        console.debug('[NFB] frozen:', el.tagName,
          (el.className || '').toString().slice(0, 60));
      }
      if (snap && snap !== 'none') {
        // Track so thaw can restore it
        const already = frozenElements.find(f => f.el === el);
        if (!already) {
          frozenElements.push({
            el,
            overflow:       null,
            overflowY:      null,
            scrollSnapType: el.style.scrollSnapType || null,
          });
        }
        el.style.setProperty('scroll-snap-type', 'none', 'important');
      }

      for (const child of el.children) walk(child, depth + 1);
    }
    walk(root, 0);
  }

  // Restore all inline styles that freezeScrollContainers() changed.
  // Must use removeProperty() — assignment to '' does not reliably clear
  // properties that were set via setProperty(..., 'important').
  function thawScrollContainers() {
    for (const { el, overflow, overflowY, scrollSnapType } of frozenElements) {
      el.style.removeProperty('overflow');
      el.style.removeProperty('overflow-y');
      el.style.removeProperty('scroll-snap-type');
      // Restore original inline values if they existed
      if (overflow)       el.style.overflow       = overflow;
      if (overflowY)      el.style.overflowY      = overflowY;
      if (scrollSnapType) el.style.scrollSnapType = scrollSnapType;
    }
    frozenElements = [];
    console.debug('[NFB] scroll containers thawed');
  }

  function clearScrollLock() {
    if (!scrollLockHandlers) return;
    const { stopScroll, stopKeys } = scrollLockHandlers;
    const opts = { capture: true };

    [window, document].forEach(t => {
      t.removeEventListener('wheel',      stopScroll, opts);
      t.removeEventListener('touchstart', stopScroll, opts);
      t.removeEventListener('touchmove',  stopScroll, opts);
    });
    window.removeEventListener('keydown', stopKeys, opts);

    scrollLockHandlers = null;
    thawScrollContainers();
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

  if (isFacebook || isTwitter || isYouTube || isInstagram || isReddit) {
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
        freezeScrollContainers(); // re-run each attempt — containers load late
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
