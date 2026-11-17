// Iron Android - in-app update prompt. Only runs inside the native Android app.
(function () {
  if (!window.Capacitor || !Capacitor.isNativePlatform || !Capacitor.isNativePlatform()) return;

  var Updater = Capacitor.registerPlugin('IronUpdater');
  var API = 'https://api.github.com/repos/Mune-Su/Iron-Android/releases/latest';
  var RELEASES = 'https://github.com/Mune-Su/Iron-Android/releases/latest';
  var THROTTLE_MS = 30 * 60 * 1000;
  var lastCheck = 0, showing = false;

  function parse(v) { return String(v).split('.').map(function (n) { return parseInt(n, 10) || 0; }); }
  function newer(a, b) {
    var x = parse(a), y = parse(b);
    for (var i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); }
    return false;
  }

  function showBanner(version, url) {
    if (showing) return;
    showing = true;
    var bar = document.createElement('div');
    bar.setAttribute('role', 'alert');
    bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483647;' +
      'background:#0b1220;color:#f5a524;border:1px solid #f5a524;border-radius:10px;padding:12px 14px;' +
      'font:14px/1.4 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.5)';
    var msg = document.createElement('div');
    msg.textContent = 'Iron ' + version + ' is available.';
    msg.style.marginBottom = '10px';
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:10px';
    function btn(label, primary) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.style.cssText = 'flex:1;padding:9px;border-radius:8px;font:600 14px system-ui,sans-serif;border:1px solid #f5a524;' +
        (primary ? 'background:#f5a524;color:#0b1220' : 'background:transparent;color:#f5a524');
      return b;
    }
    var later = btn('Later', false), go = btn('Update now', true);
    row.appendChild(later); row.appendChild(go);
    bar.appendChild(msg); bar.appendChild(row);
    document.body.appendChild(bar);

    later.addEventListener('click', function () { bar.remove(); showing = false; });
    go.addEventListener('click', function () {
      go.disabled = true; later.disabled = true;
      go.textContent = 'Downloading...';
      var handle = Updater.addListener('progress', function (e) {
        go.textContent = 'Downloading ' + e.percent + '%';
      });
      Updater.downloadAndInstall({ url: url }).then(function () {
        msg.textContent = 'Tap Install on the screen that opened. Iron will restart on the new version.';
        go.textContent = 'Done'; later.disabled = false; later.textContent = 'Close';
      }).catch(function (err) {
        var m = String((err && err.message) || err);
        go.disabled = false; later.disabled = false;
        go.textContent = 'Update now';
        if (m === 'permission') {
          msg.textContent = 'Allow Iron to install updates on the settings screen that just opened, come back, then tap Update now.';
        } else {
          msg.textContent = m + ' - you can also download it from GitHub.';
          go.textContent = 'Open GitHub';
          go.onclick = function () { window.open(RELEASES, '_blank'); };
        }
      }).then(function () { if (handle && handle.then) handle.then(function (h) { h.remove(); }); });
    });
  }

  function check(force) {
    var now = Date.now();
    if (!force && now - lastCheck < THROTTLE_MS) return;
    lastCheck = now;
    Promise.all([
      Updater.getVersion(),
      fetch(API, { headers: { Accept: 'application/vnd.github+json' } }).then(function (r) { return r.json(); })
    ]).then(function (res) {
      var current = res[0].version, rel = res[1];
      var asset = (rel.assets || []).filter(function (a) { return /^Iron-\d+\.\d+\.\d+\.apk$/.test(a.name); })[0];
      if (!asset) return;
      var latest = asset.name.match(/^Iron-(\d+\.\d+\.\d+)\.apk$/)[1];
      if (newer(latest, current)) showBanner(latest, asset.browser_download_url);
    }).catch(function () { /* offline or rate-limited: try again next time */ });
  }

  function start() {
    check(true);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) check(false); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
