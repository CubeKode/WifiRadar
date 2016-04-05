/**
 * bootstrap.js
 *
 * This file does a number of things:
 *
 * 1. It preps the frontend, registers itself with Gecko, turns on the screen,
 *    sets some initial settings, etc. At the end it will emit a ready event,
 *    and your own code can run. See the examples/ folder.
 * 2. Manage WiFi connections for you based on local_settings.json file.
 *    If you want to do this yourself, remove the section.
 * 3. Manage cellular connections for you based on same file.
 *    Also if you want to manage that yourself, remove the section.
 * 4. Add autogrant, because you cannot grant permissions w/o display
 */
screen.mozLockOrientation('landscape');
new Promise(res => {
  // Wait until the page is loaded
  document.readyState === 'complete' ? res() : window.onload = res;
}).then(() => {
  // Register ourselfs with Gecko
  var evt = new CustomEvent('mozContentEvent',
    { bubbles: true, cancelable: false,
      detail: { type: 'system-message-listener-ready' } });
  window.dispatchEvent(evt);

  // Listen for wakelock events
  window.cpuManager = new CpuManager();
  window.cpuManager.start();

  // Disable cpuSleepAllowed, need to be explicitely run by user
  navigator.mozPower.cpuSleepAllowed = false;
}).then(() => {
  // Turn the screen on

  // No clue why this is needed but it works.
  navigator.mozPower.screenBrightness = 0.9;

  return new Promise((res, rej) => {
    setTimeout(function () {
      navigator.mozPower.screenEnabled = true;
      navigator.mozPower.screenBrightness = 1;
      res();
    }, 100);
  });
}).then(() => {
  // Initial settings
  return new Promise((res, rej) => {
    var req = navigator.mozSettings.createLock().set({
      'ril.data.enabled': false,
      'ftu.ril.data.enabled': false,
      'ril.data.roaming_enabled': false,
      'wifi.enabled': true,
      'debugger.remote-mode': 'adb-devtools',
      'devtools.debugger.remote-enabled': true, // pre-1.4
      'app.reportCrashes': 'always'
    });
    req.onsuccess = res;
    req.onerror = rej;
  });
}).then(() => {
  console.log('Wrote settings successfully');
  // Fetching local_settings.json
  return new Promise((res, rej) => {
    var x = new XMLHttpRequest();
    x.onload = function() {
      if (x.status !== 200) {
        console.warn('Could not fetch js/local_settings.json, please add it', x.status);
        return res({});
      }

      var c = x.response;
      res(c);
    };
    x.onerror = function() {
      console.warn('Could not fetch js/local_settings.json, please add it', x.error);
      res({});
    };

    x.open('GET', '/js/local_settings.json');
    x.responseType = 'json';
    try {
      x.send();
    }
    catch (ex) {
      console.warn('Could not fetch js/local_settings.json, please add it', ex);
      res({});
    }
  });
}).then(localSettings => {
  (document.querySelector('.status') || {}).textContent = 'Pronto';

  window.addEventListener('online', () => {
    (document.querySelector('.status') || {}).textContent = 'Pronto e Conectado';
  });
  window.addEventListener('offline', () => {
    (document.querySelector('.status') || {}).textContent = 'Pronto (sem conexão)';
  });

  startAutogrant();

  window.dispatchEvent(new CustomEvent('ready', { detail: localSettings }));
}).catch(err => {
  navigator.vibrate(200);

  console.error('Booting failed', err);

  (document.querySelector('.status') || {}).textContent = 'Falha no boot, verifique o console';
});

/**
 * Autogrant
 * Because there will be no UI to grant permissions
 */
function startAutogrant() {
  // Autogrant permissions
  window.addEventListener('mozChromeEvent', function(evt) {
    var detail = evt.detail;
    switch (detail.type) {
    case 'permission-prompt':
      console.log('autogrant permissions for', detail.permissions);

      var ev2 = document.createEvent('CustomEvent');
      ev2.initCustomEvent('mozContentEvent', true, true, {
        id: detail.id,
        type: 'permission-allow',
        remember: true
      });
      window.dispatchEvent(ev2);
      break;

    case 'remote-debugger-prompt':
      dump('REMOTE DEBUGGER PROMPT!!!\n');
      break;
    }
  });
}
