#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const { spawnSync } = require('child_process');

const packageRoot = path.resolve(__dirname, '..');
const llamaPackageRoot = path.join(packageRoot, 'node_modules', 'llama.rn');
const version = require(path.join(llamaPackageRoot, 'package.json')).version;
const releaseUrl = `https://github.com/mybigday/llama.rn/releases/download/v${version}/llama-rn-android-jni-libs.tar.gz`;
const targetDir = path.join(llamaPackageRoot, 'android', 'src', 'main', 'jniLibs');
const markerPath = path.join(targetDir, '.llama-rn.sha256');

if (!fs.existsSync(llamaPackageRoot)) {
  console.log('llama.rn is not installed yet; skipping artifact bootstrap.');
  process.exit(0);
}

if (fs.existsSync(markerPath)) {
  console.log('llama.rn Android JNI artifacts already installed.');
  process.exit(0);
}

function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    https.get(url, { headers: { 'User-Agent': 'pico-llama-rn-bootstrap' } }, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        downloadFile(response.headers.location, outputPath).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Download failed with status ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      fs.rmSync(outputPath, { force: true });
      reject(err);
    });
  });
}

(async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'llama-rn-artifacts-'));
  const archivePath = path.join(tempDir, 'llama-rn-android-jni-libs.tar.gz');

  try {
    console.log(`Downloading ${releaseUrl}`);
    await downloadFile(releaseUrl, archivePath);
    fs.rmSync(targetDir, { recursive: true, force: true });
    fs.mkdirSync(targetDir, { recursive: true });
    const extract = spawnSync('tar', ['-xzf', archivePath, '-C', llamaPackageRoot], { stdio: 'inherit' });
    if (extract.status !== 0) {
      throw new Error(`tar exited with status ${extract.status}`);
    }
    fs.writeFileSync(markerPath, 'bootstrap-installed\n');
    console.log(`llama.rn Android JNI artifacts installed at ${targetDir}`);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})();
