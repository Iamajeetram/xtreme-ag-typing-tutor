const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

let mainWindow = null;
let localServer = null;

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

function startStaticServer(rootDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const parsedUrl = new URL(req.url || '/', 'http://127.0.0.1');
        let pathname = decodeURIComponent(parsedUrl.pathname);
        if (pathname === '/' || pathname === '') pathname = '/index.html';
        const safeRelPath = path.normalize(pathname).replace(/^([/\\])+/, '');
        const candidatePaths = [
          path.join(rootDir, safeRelPath),
          path.join(rootDir, '..', 'public', safeRelPath),
          path.join(rootDir, '..', safeRelPath)
        ];
        let foundFile = null;
        for (const candidate of candidatePaths) {
          if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            foundFile = candidate;
            break;
          }
        }
        if (!foundFile) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Not found');
          return;
        }
        const ext = path.extname(foundFile).toLowerCase();
        const headers = {
          'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
          'Access-Control-Allow-Origin': '*'
        };
        if (ext === '.json') headers['Cache-Control'] = 'no-store, no-cache, must-revalidate';
        res.writeHead(200, headers);
        fs.createReadStream(foundFile).pipe(res);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Internal Server Error');
      }
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
    server.on('error', reject);
  });
}

async function createWindow() {
  const distDir = path.join(__dirname, '..', 'dist');
  const { server, port } = await startStaticServer(distDir);
  localServer = server;

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'AG Typing Tutor — Xtreme AG Apps',
    icon: path.join(__dirname, '..', 'src', 'assets', 'AG-Typing-Tutor-Icon-512.png'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });

  mainWindow.maximize();
  await mainWindow.loadURL(`http://127.0.0.1:${port}/index.html`);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if ((url.startsWith('https://') || url.startsWith('http://')) && !url.startsWith('http://127.0.0.1')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (localServer) { try { localServer.close(); } catch (e) {} }
  if (process.platform !== 'darwin') app.quit();
});
