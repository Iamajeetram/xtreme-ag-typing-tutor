const fs = require('fs');
const path = require('path');
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  if (fs.statSync(src).isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursiveSync(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

const extraFolders = [
  ['public/efficiency-bank', 'efficiency-bank'],
  ['src/efficiency-bank', 'efficiency-bank'],
  ['efficiency-bank', 'efficiency-bank'],
  ['public/exercises', 'exercises'],
  ['src/exercises', 'exercises'],
  ['exercises', 'exercises']
];

for (const [srcRel, destRel] of extraFolders) {
  const srcPath = path.join(rootDir, srcRel);
  if (fs.existsSync(srcPath)) copyRecursiveSync(srcPath, path.join(distDir, destRel));
}
