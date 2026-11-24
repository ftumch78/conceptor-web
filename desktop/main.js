// Conceptor for Windows and Mac: the Conceptor web app in its own window.
// Electron 32 is used because it is the last version that runs on macOS 10.15 (Catalina).
'use strict';
const { app, BrowserWindow, protocol, net, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

// The app's files are served from app://conceptor/ so the page counts as a secure site:
// the microphone, the Library sync folder and the audio worklets all need that.
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);
const ROOT = path.join(__dirname, 'app');
const smokeArg = process.argv.find((a) => a.startsWith('--smoke='));   // automatic launch test on GitHub

if (!smokeArg && !app.requestSingleInstanceLock()) app.quit();
let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 860, minWidth: 380, minHeight: 600,
    backgroundColor: '#1B1C1F', title: 'Conceptor', autoHideMenuBar: true, show: !!smokeArg,
    icon: path.join(ROOT, 'icon-512.png'),
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false, autoplayPolicy: 'no-user-gesture-required', spellcheck: false }
  });
  // A5: opens filling the whole screen
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  // web links open in the normal browser
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('app://')) { e.preventDefault(); if (/^https?:/i.test(url)) shell.openExternal(url); }
  });
  win.loadURL('app://conceptor/index.html');
}

app.whenReady().then(() => {
  protocol.handle('app', (req) => {
    let p = decodeURIComponent(new URL(req.url).pathname);
    if (p === '/' || p === '') p = '/index.html';
    const file = path.normalize(path.join(ROOT, p));
    if (!file.startsWith(ROOT) || !fs.existsSync(file)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
  // microphone, audio devices, the Library sync folder: allowed (macOS still asks once for the microphone)
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(true));
  session.defaultSession.setPermissionCheckHandler(() => true);
  createWindow();
  if (smokeArg) smokeTest(smokeArg.slice('--smoke='.length));
});
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on('window-all-closed', () => app.quit());

// Launch test: opens the app, starts the sound engine, makes a song, saves a picture and the results, then closes.
function smokeTest(out) {
  const errors = [];
  win.webContents.on('console-message', (e, level, msg) => { if (level >= 3) errors.push(msg); });
  win.webContents.once('did-finish-load', async () => {
    await new Promise((r) => setTimeout(r, 4000));
    const js = `(async () => {
      const r = { version: CZ.VERSION, secure: window.isSecureContext, folderSync: typeof window.showDirectoryPicker, mic: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) };
      try { await S.startAudio(); r.audio = S.ctx.state + ', ' + S.ctx.sampleRate + ' Hz'; } catch (e) { r.audio = 'error: ' + e.message; }
      try { await S.newSong('Smoke test'); r.song = S.song.name; S.song.mode = 'polished'; ui.screen = 'mix'; render(); } catch (e) { r.song = 'error: ' + e.message; }
      try { const sr = S.sr || 48000, n = sr * 4, a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = 0.4 * Math.sin(2 * Math.PI * 220 * i / sr);
            S.song.tracks[0].audio = a; S.song.tracks[0].name = 'Guitar'; S.song.tracks[0].fx.pedals[1].on = true; S.song.tracks[0].fx.amp.on = true; S.changed('audio'); render(); r.track = 'ok'; } catch (e) { r.track = 'error: ' + e.message; }
      try { const x = await S.exportFile({ track: -1, withFx: true, format: 0, start: 0, end: 0, channelsOnly: true }); let pk = 0; for (const v of x.channels[0]) pk = Math.max(pk, Math.abs(v)); r.mixPeak = pk.toFixed(3); } catch (e) { r.mixPeak = 'error: ' + e.message; }
      r.window = innerWidth + 'x' + innerHeight;
      return JSON.stringify(r); })()`;
    let res;
    try { res = JSON.parse(await win.webContents.executeJavaScript(js, true)); } catch (e) { res = { error: e.message }; }
    await new Promise((r) => setTimeout(r, 1500));
    try { fs.writeFileSync(out + '.png', (await win.webContents.capturePage()).toPNG()); } catch (e) { res.picture = 'error: ' + e.message; }
    fs.writeFileSync(out + '.json', JSON.stringify({ result: res, errors }, null, 1));
    app.exit(0);
  });
}
