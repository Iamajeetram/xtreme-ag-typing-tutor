const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

if (process.platform === 'darwin') {
  const releaseDir = path.join(process.cwd(), 'release');
  if (fs.existsSync(releaseDir)) {
    const subdirs = ['mac', 'mac-x64', 'mac-arm64', 'mac-universal'];
    for (const sub of subdirs) {
      const appBundle = path.join(releaseDir, sub, 'AG Typing Tutor.app');
      if (fs.existsSync(appBundle)) {
        try {
          console.log('[sign-mac] Clearing quarantine attributes on:', appBundle);
          execSync(`xattr -cr "${appBundle}"`, { stdio: 'inherit' });
        } catch (e) {
          console.warn('[sign-mac] Warning:', e.message);
        }
      }
    }
  }
}
