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
  ['src/daily-live', 'daily-live']
];

for (const [srcRel, destRel] of extraFolders) {
  const srcPath = path.join(rootDir, srcRel);
  if (fs.existsSync(srcPath)) copyRecursiveSync(srcPath, path.join(distDir, destRel));
}

copyRecursiveSync(distDir, appDistDir);
console.log('Successfully prepared app_dist and dist');
