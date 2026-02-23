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
  const isFacebook  = host.includes('facebook.com');
  const isYouTube   = host.includes('youtube.com');
  const isLinkedIn  = host.includes('linkedin.com');
  const isInstagram = host.includes('instagram.com');
  const isTwitter   = host.includes('x.com') || host.includes('twitter.com');
  const isReddit    = host.includes('reddit.com');
  const isTikTok    = host.includes('tiktok.com');

  if (!isFacebook && !isYouTube && !isLinkedIn &&
      !isInstagram && !isTwitter && !isReddit && !isTikTok) return;

  // --- CSS Rules per Site ---

  function getFeedCSS() {
    if (isFacebook) {
      return `
        /* ---- Facebook Newsfeed ---- */

        /*
         * Exact feed container class combo (inspect-verified).
         * These atomic classes are FB-generated and may change on UI deploys —
         * the data-pagelet selectors below act as stable fallbacks.
         */
        .x78zum5.x1q0g3np.xl56j7k {
          display: none !important;
        }

        /* Stable: main feed pagelet wrapper */
        [data-pagelet="MainFeed"],
        [data-pagelet^="FeedUnit"],
        [data-pagelet="GroupsFeed"] {
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

        /*
         * Exact feed container class combo (inspect-verified).
         * LinkedIn obfuscates class names; these may change on deploys —
         * the attribute/structural selectors below are stable fallbacks.
         */
        ._4062c218.b3b1c987._98c731d9._3f7f64c2.e2718449._4a745388 {
          display: none !important;
        }

        /* Stable: finite-scroll feed wrapper and its content */
        main > div.relative > .scaffold-finite-scroll,
        .scaffold-finite-scroll__content,
        .scaffold-finite-scroll {
          display: none !important;
        }

        /* componentkey attribute on the feed list container */
        [componentkey^="container-update-list_mainFeed"] {
          display: none !important;
        }

        /* ARIA label on main feed region */
        [aria-label^="Main Feed"] {
          display: none !important;
        }

        /* Individual feed post items */
        .feed-shared-update-v2,
        .occludable-update,
        [data-id*="urn:li:activity"],
        [data-chameleon-result-urn*="update"],
        [data-view-name="feed-full-update"],
        [data-view-name="feed-ad-unit"] {
          display: none !important;
        }

        /* Right-rail LinkedIn News module */
        #feed-news-module,
        .news-module {
          display: none !important;
        }

        /* "People you may know" sidebar */
        .pymk-flyout {
          display: none !important;
        }
      `;
    }

    if (isInstagram) {
      return `
        /* ---- Instagram Feed ---- */

        /* Main home feed (role="feed" is used by Instagram) */
        [role="feed"] {
          display: none !important;
        }

        /* Stories row at the top of home */
        [aria-label="Stories"] {
          display: none !important;
        }

        /* Reels tab full-screen feed */
        [aria-label="Reels"] {
          display: none !important;
        }

        /* "Suggested posts" section that appears mid-feed */
        [aria-label="Suggested posts"] {
          display: none !important;
        }

        /*
         * Belt-and-suspenders: individual post articles in the home feed.
         * Instagram uses obfuscated classes; if the above stops working,
         * inspect the feed container and add its classes here like FB/LinkedIn.
         */
        main article {
          display: none !important;
        }
      `;
    }

    if (isTwitter) {
      return `
        /* ---- X / Twitter Feed ---- */

        /*
         * Twitter uses data-testid attributes consistently — these are
         * significantly more stable than their obfuscated class names.
         */

        /* The home timeline section */
        [aria-label="Home timeline"],
        [aria-label="Timeline: Your Home Timeline"] {
          display: none !important;
        }

        /* "For You" / "Following" tab content cells */
        [data-testid="primaryColumn"] [data-testid="cellInnerDiv"] {
          display: none !important;
        }

        /* Trending / What's happening sidebar */
        [aria-label="Timeline: Trending now"],
        [data-testid="sidebarColumn"] [data-testid="trend"] {
          display: none !important;
        }

        /* "Who to follow" sidebar suggestions */
        [data-testid="UserCell"] {
          display: none !important;
        }
      `;
    }

    if (isReddit) {
      return `
        /* ---- Reddit Feed ---- */

        /*
         * New Reddit uses web components — custom element names are very
         * stable, unlike class-based selectors.
         */

        /* The main post feed (new Reddit) */
        shreddit-feed {
          display: none !important;
        }

        /* Individual post cards */
        shreddit-post {
          display: none !important;
        }

        /* Trending / Popular carousel on home */
        shreddit-trending-searches,
        [data-testid="trending-carousel"] {
          display: none !important;
        }

        /* Old Reddit: the main listing */
        #siteTable,
        .listings {
          display: none !important;
        }

        /* Old Reddit: promoted posts */
        .promoted-tag {
          display: none !important;
        }
      `;
    }

    if (isTikTok) {
      return `
        /* ---- TikTok Feed ---- */

        /*
         * TikTok uses data-e2e attributes in their web app — these are
         * more stable than their obfuscated class names.
         */

        /* Home "For You" feed items */
        [data-e2e="recommend-list-item-container"],
        [data-e2e="home-item-list"] {
          display: none !important;
        }

        /* Following feed */
        [data-e2e="follow-item-list"] {
          display: none !important;
        }

        /* Feed video card containers */
        [data-e2e="video-card-container"],
        [data-e2e="video-desc"] {
          display: none !important;
        }

        /*
         * Obfuscated class fallback — TikTok encodes feed wrappers with
         * "FeedCard" in the class name pattern.
         * Inspect the feed div and add specific classes here if needed.
         */
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
  // Facebook and LinkedIn are SPAs that re-render content without full page
  // reloads. The CSS style tag persists, but re-injecting it on navigation
  // ensures it stays in <head> (some frameworks clear and re-build <head>).

  let observerTimer = null;

  const observer = new MutationObserver(() => {
    // Re-inject the style tag if it disappeared (e.g. SPA cleared <head>)
    if (!document.getElementById(STYLE_ID)) {
      clearTimeout(observerTimer);
      observerTimer = setTimeout(() => {
        chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
          if (chrome.runtime.lastError) return;
          if (!response || !response.procrastinating) {
            injectBlocker();
          }
        });
      }, 80);
    }
  });

  function startObserver() {
    // Watch <head> for child changes (style tag removal) and
    // watch <body> subtree for SPA navigation that swaps entire sections.
    const head = document.head || document.documentElement;
    observer.observe(head, { childList: true, subtree: false });

    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: false });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver, { once: true });
  } else {
    startObserver();
  }

})();
