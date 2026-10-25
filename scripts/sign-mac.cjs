const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
if (process.platform === 'darwin') {
  const releaseDir = path.join(process.cwd(), 'release');
  if (fs.existsSync(releaseDir)) {
    for (const sub of ['mac-arm64', 'mac', 'mac-x64', 'mac-universal']) {
      const appBundle = path.join(releaseDir, sub, 'AG Typing Tutor.app');
      if (fs.existsSync(appBundle)) {
        try { execSync(`xattr -cr "${appBundle}"`); } catch (e) {}
      }
    }
  }
}
