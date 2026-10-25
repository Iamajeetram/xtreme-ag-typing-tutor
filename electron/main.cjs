const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const http = require('http');
const https = require('https');
const fs = require('fs');
const os = require('os');
const { spawn, execSync } = require('child_process');

if (process.platform === 'win32') {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-software-rasterizer');
}

let mainWindow = null;
let localServer = null;
let activePort = 45780;

let updateState = {
  state: 'idle', // 'idle' | 'downloading' | 'installing' | 'done' | 'error'
  percent: 0,
  message: ''
};

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8'
};

function getProfileFilePath() {
  try {
    const dir = app.getPath('userData');
    fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, 'ag-user-profile.json');
  } catch (e) {
    return path.join(os.homedir(), '.ag-typing-tutor-profile.json');
  }
}

function getSearchRoots() {
  const appPath = app.getAppPath();
  const resPath = process.resourcesPath || path.join(__dirname, '..', '..');
  return [
    path.join(__dirname, '..', 'app_dist'),
    path.join(__dirname, '..', 'dist'),
    path.join(appPath, 'app_dist'),
    path.join(appPath, 'dist'),
    path.join(resPath, 'app_dist'),
    path.join(resPath, 'app', 'app_dist'),
    path.join(resPath, 'app', 'dist'),
    path.join(__dirname, '..'),
    appPath
  ];
}

function downloadFileWithRedirects(fileUrl, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const request = (currentUrl, redirectsLeft = 10) => {
      if (redirectsLeft <= 0) return reject(new Error('Too many redirects'));
      const mod = currentUrl.startsWith('https') ? https : http;
      mod.get(currentUrl, { headers: { 'User-Agent': 'AG-Typing-Tutor-Updater' } }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          res.resume();
          const nextUrl = new URL(res.headers.location, currentUrl).toString();
          return request(nextUrl, redirectsLeft - 1);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error('HTTP ' + res.statusCode));
        }
        const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
        let receivedBytes = 0;
        const fileStream = fs.createWriteStream(destPath);
        res.on('data', (chunk) => {
          receivedBytes += chunk.length;
          if (totalBytes > 0) {
            onProgress(Math.min(99, Math.round((receivedBytes / totalBytes) * 100)));
          }
        });
        res.pipe(fileStream);
        fileStream.on('finish', () => fileStream.close(() => resolve(destPath)));
        fileStream.on('error', (err) => {
          try { fs.unlinkSync(destPath); } catch {}
          reject(err);
        });
      }).on('error', reject);
    };
    request(fileUrl);
  });
}

async function performInAppUpdate(downloadUrl, fileName) {
  try {
    updateState = { state: 'downloading', percent: 1, message: 'Downloading update package...' };
    const safeName = path.basename(fileName || (process.platform === 'darwin' ? 'update.dmg' : 'update.exe'));
    const destPath = path.join(os.tmpdir(), `ag-update-${Date.now()}-${safeName}`);

    await downloadFileWithRedirects(downloadUrl, destPath, (pct) => {
      updateState.percent = pct;
      updateState.message = `Downloading update... ${pct}%`;
    });

    updateState = { state: 'installing', percent: 100, message: 'Installing update & restarting...' };

    if (process.platform === 'win32') {
      const child = spawn(destPath, ['/S', '--force-run'], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
      updateState = { state: 'done', percent: 100, message: 'Restarting...' };
      setTimeout(() => app.quit(), 600);
    } else if (process.platform === 'darwin') {
      const mountPoint = `/Volumes/AGTypingUpdate_${Date.now()}`;
      try {
        execSync(`hdiutil attach "${destPath}" -mountpoint "${mountPoint}" -nobrowse -quiet`);
        const mountedApp = path.join(mountPoint, 'AG Typing Tutor.app');
        const targetApp = '/Applications/AG Typing Tutor.app';
        if (fs.existsSync(mountedApp)) {
          execSync(`rm -rf "${targetApp}" && cp -R "${mountedApp}" "${targetApp}" && xattr -cr "${targetApp}"`);
          execSync(`hdiutil detach "${mountPoint}" -quiet || true`);
          updateState = { state: 'done', percent: 100, message: 'Update installed! Restarting...' };
          setTimeout(() => {
            spawn('open', ['-n', targetApp], { detached: true, stdio: 'ignore' }).unref();
            app.quit();
          }, 500);
          return;
        }
      } catch (macErr) {
        try { execSync(`hdiutil detach "${mountPoint}" -quiet || true`); } catch {}
        shell.openPath(destPath);
        updateState = { state: 'done', percent: 100, message: 'Opened Mac installer!' };
        return;
      }
    } else {
      shell.openPath(destPath);
      updateState = { state: 'done', percent: 100, message: 'Opened installer!' };
    }
  } catch (err) {
    updateState = { state: 'error', percent: 0, message: err.message || 'Download failed' };
  }
}

function startStaticServer() {
  const roots = getSearchRoots();
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const parsedUrl = new URL(req.url || '/', 'http://127.0.0.1');
        let pathname = decodeURIComponent(parsedUrl.pathname);

        // 0. Persistent User Profile on Disk (Survives App Restarts & Updates)
        if (pathname === '/__ag_profile') {
          const pFile = getProfileFilePath();
          if (req.method === 'GET') {
            let profile = null;
            if (fs.existsSync(pFile)) {
              try { profile = JSON.parse(fs.readFileSync(pFile, 'utf-8')); } catch {}
            }
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
            res.end(JSON.stringify({ ok: true, profile }));
            return;
          }
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body || '{}');
                if (parsed && parsed.name) {
                  fs.writeFileSync(pFile, JSON.stringify(parsed, null, 2), 'utf-8');
                }
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ ok: true }));
              } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ ok: false, error: err.message }));
              }
            });
            return;
          }
        }

        // 1. In-App Updater & Runtime Info Endpoints
        if (pathname === '/__ag_app_info') {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
          res.end(JSON.stringify({
            version: app.getVersion(),
            platform: process.platform,
            arch: process.arch,
            isElectron: true
          }));
          return;
        }
        if (pathname === '/__ag_update_status') {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
          res.end(JSON.stringify(updateState));
          return;
        }
        if (pathname === '/__ag_perform_update' && req.method === 'POST') {
          const dlUrl = parsedUrl.searchParams.get('url');
          const dlName = parsedUrl.searchParams.get('name') || '';
          if (!dlUrl) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing url' }));
            return;
          }
          performInAppUpdate(dlUrl, dlName);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        if (pathname === '/' || pathname === '') pathname = '/index.html';
        const safeRelPath = pathname.replace(/^[/\\]+/, '');

        let foundFile = null;
        for (const rootDir of roots) {
          const candidates = [
            path.join(rootDir, safeRelPath),
            path.join(rootDir, 'public', safeRelPath)
          ];
          for (const candidate of candidates) {
            if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
              foundFile = candidate;
              break;
            }
          }
          if (foundFile) break;
        }

        if (!foundFile) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('File not found: ' + safeRelPath);
          return;
        }

        const ext = path.extname(foundFile).toLowerCase();
        const headers = {
          'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
          'Access-Control-Allow-Origin': '*'
        };
        if (ext === '.json') headers['Cache-Control'] = 'no-store, no-cache, must-revalidate';

        const fileBuffer = fs.readFileSync(foundFile);
        res.writeHead(200, headers);
        res.end(fileBuffer);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Server error: ' + err.message);
      }
    });

    const tryPort = (portToTry) => {
      const onError = (err) => {
        server.removeListener('listening', onListening);
        if (err.code === 'EADDRINUSE' && portToTry < 45790) {
          tryPort(portToTry + 1);
        } else {
          server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
        }
      };
      const onListening = () => {
        server.removeListener('error', onError);
        resolve({ server, port: server.address().port });
      };
      server.once('error', onError);
      server.once('listening', onListening);
      server.listen(portToTry, '127.0.0.1');
    };
    tryPort(45780);
  });
}

async function createWindow() {
  if (!localServer) {
    const { server, port } = await startStaticServer();
    localServer = server;
    activePort = port;
  }

  let iconPath = path.join(__dirname, '..', 'build', 'icon.png');
  if (!fs.existsSync(iconPath)) {
    iconPath = path.join(__dirname, '..', 'src', 'assets', 'AG-Typing-Tutor-Icon-512.png');
  }

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    show: true,
    backgroundColor: '#0f172a',
    title: 'AG Typing Tutor — Xtreme AG Apps',
    icon: iconPath,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });

  mainWindow.maximize();
  await mainWindow.loadURL(`http://127.0.0.1:${activePort}/index.html`);

  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if ((url.startsWith('https://') || url.startsWith('http://')) && !url.startsWith('http://127.0.0.1')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

app.on('window-all-closed', () => {
  if (localServer) { try { localServer.close(); localServer = null; } catch (e) {} }
  app.quit();
});
