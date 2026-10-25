const fs = require('fs');
const path = require('path');
const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const appDistDir = path.join(rootDir, 'app_dist');

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  if (fs.statSync(src).isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursiveSync(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

const extraFolders = [
  ['public/efficiency-bank', 'efficiency-bank'],
  ['src/efficiency-bank', 'efficiency-bank'],
  ['efficiency-bank', 'efficiency-bank'],
  ['public/exercises', 'exercises'],
  ['src/exercises', 'exercises'],
  ['exercises', 'exercises'],
  ['public/daily-live', 'daily-live'],
  ['src/daily-live', 'daily-live'],
  ['src/assets', 'assets'],
  ['src/style.css', 'style.css'],
  ['src/print.css', 'print.css'],
  ['src/style.css', 'src/style.css'],
  ['src/print.css', 'src/print.css']
];

for (const [srcRel, destRel] of extraFolders) {
  const srcPath = path.join(rootDir, srcRel);
  if (fs.existsSync(srcPath)) copyRecursiveSync(srcPath, path.join(distDir, destRel));
}

// Ensure dist/index.html always has a fallback link to ./style.css and ./print.css
const distIndex = path.join(distDir, 'index.html');
if (fs.existsSync(distIndex)) {
  let html = fs.readFileSync(distIndex, 'utf8');
  if (!html.includes('href="./style.css"')) {
    html = html.replace('</head>', '  <link rel="stylesheet" href="./style.css" />\n  <link rel="stylesheet" href="./print.css" />\n</head>');
    fs.writeFileSync(distIndex, html, 'utf8');
  }
}

copyRecursiveSync(distDir, appDistDir);
console.log('Successfully prepared app_dist and dist with guaranteed CSS');
