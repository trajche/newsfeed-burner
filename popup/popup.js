/**
 * Newsfeed Burner - Popup Script
 */

(function () {
  'use strict';

  const panelBlocking = document.getElementById('state-blocking');
  const panelProcrastinating = document.getElementById('state-procrastinating');
  const timerEl = document.getElementById('timer');
  const btnProcrastinate = document.getElementById('btn-procrastinate');
  const btnStop = document.getElementById('btn-stop');

  let tickInterval = null;
  let endTime = null;

  // --- Rendering ---

  function showBlocking() {
    panelBlocking.hidden = false;
    panelProcrastinating.hidden = true;
    clearInterval(tickInterval);
    tickInterval = null;
  }

  function showProcrastinating(end) {
    endTime = end;
    panelBlocking.hidden = true;
    panelProcrastinating.hidden = false;
    renderTimer();
    clearInterval(tickInterval);
    tickInterval = setInterval(renderTimer, 500);
  }

  function renderTimer() {
    const remaining = Math.max(0, endTime - Date.now());
    const totalSeconds = Math.ceil(remaining / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    if (remaining <= 0) {
      clearInterval(tickInterval);
      showBlocking();
    }
  }

  // --- State ---

  function loadState() {
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
      if (chrome.runtime.lastError || !response) return;
      if (response.procrastinating) {
        showProcrastinating(response.procrastinationEnd);
      } else {
        showBlocking();
      }
    });
  }

  // --- Events ---

  btnProcrastinate.addEventListener('click', () => {
    btnProcrastinate.disabled = true;
    chrome.runtime.sendMessage({ type: 'START_PROCRASTINATION' }, (response) => {
      if (response && response.success) {
        loadState();
      }
      btnProcrastinate.disabled = false;
    });
  });

  btnStop.addEventListener('click', () => {
    btnStop.disabled = true;
    clearInterval(tickInterval);
    chrome.runtime.sendMessage({ type: 'STOP_PROCRASTINATION' }, (response) => {
      if (response && response.success) {
        showBlocking();
      }
      btnStop.disabled = false;
    });
  });

  // --- Init ---
  loadState();
  document.getElementById('version').textContent =
    'v' + chrome.runtime.getManifest().version;

})();
