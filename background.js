/**
 * Newsfeed Burner - Background Service Worker
 * Manages procrastination timer and global blocking state.
 */

const ALARM_NAME = 'procrastination-end';
const PROCRASTINATION_MS = 15 * 60 * 1000; // 15 minutes

// --- Init ---

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ procrastinating: false, procrastinationEnd: null });
  chrome.action.setBadgeText({ text: '' });
});

// Restore badge on service worker restart if timer is still running
chrome.storage.local.get(['procrastinating', 'procrastinationEnd'], (data) => {
  if (data.procrastinating && data.procrastinationEnd) {
    const remaining = data.procrastinationEnd - Date.now();
    if (remaining > 0) {
      updateBadge(true, remaining);
    } else {
      // Timer expired while service worker was inactive
      stopProcrastination();
    }
  }
});

// --- Message Handling ---

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  switch (msg.type) {
    case 'GET_STATE':
      chrome.storage.local.get(['procrastinating', 'procrastinationEnd'], (data) => {
        const now = Date.now();
        const active = !!(data.procrastinating && data.procrastinationEnd && data.procrastinationEnd > now);
        sendResponse({
          procrastinating: active,
          procrastinationEnd: active ? data.procrastinationEnd : null,
          remaining: active ? data.procrastinationEnd - now : 0,
        });
      });
      return true; // async

    case 'START_PROCRASTINATION':
      startProcrastination(sendResponse);
      return true;

    case 'STOP_PROCRASTINATION':
      stopProcrastination(sendResponse);
      return true;
  }
});

// --- Alarm ---

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    stopProcrastination();
  }
});

// --- Core Functions ---

function startProcrastination(sendResponse) {
  const end = Date.now() + PROCRASTINATION_MS;

  chrome.storage.local.set({ procrastinating: true, procrastinationEnd: end }, () => {
    chrome.alarms.clear(ALARM_NAME, () => {
      chrome.alarms.create(ALARM_NAME, { when: end });
    });
    updateBadge(true, PROCRASTINATION_MS);
    notifyContentScripts({ type: 'STATE_CHANGED', blocking: false });
    if (sendResponse) sendResponse({ success: true });
  });
}

function stopProcrastination(sendResponse) {
  chrome.storage.local.set({ procrastinating: false, procrastinationEnd: null }, () => {
    chrome.alarms.clear(ALARM_NAME);
    updateBadge(false);
    notifyContentScripts({ type: 'STATE_CHANGED', blocking: true });
    if (sendResponse) sendResponse({ success: true });
  });
}

function updateBadge(procrastinating, remainingMs) {
  if (procrastinating && remainingMs > 0) {
    const minutes = Math.ceil(remainingMs / 60000);
    chrome.action.setBadgeText({ text: `${minutes}m` });
    chrome.action.setBadgeBackgroundColor({ color: '#FF6B35' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

function notifyContentScripts(message) {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (!tab.url) continue;
      if (
        tab.url.includes('facebook.com') ||
        tab.url.includes('youtube.com') ||
        tab.url.includes('linkedin.com') ||
        tab.url.includes('instagram.com') ||
        tab.url.includes('x.com') ||
        tab.url.includes('twitter.com') ||
        tab.url.includes('reddit.com') ||
        tab.url.includes('tiktok.com')
      ) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
          // Tab may not have the content script injected yet — ignore
        });
      }
    }
  });
}
