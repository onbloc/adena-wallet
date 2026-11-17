#!/usr/bin/env node
/**
 * Lifecycle scripts are disabled in this repo (`enableScripts: false`), so the
 * prebuilt native libraries that some packages unpack in `postinstall` are
 * unpacked here instead, and only after their archive matches a pinned hash.
 *
 * When upgrading one of these packages, inspect the new archive and update its
 * hash here in the same change.
 */
const {createHash} = require('crypto');
const {execFileSync} = require('child_process');
const {existsSync, readFileSync} = require('fs');
const path = require('path');

const ARCHIVES = [
  {
    pkg: 'react-native-libsodium',
    version: '1.5.0',
    archive: 'libsodium/build.tgz',
    sha256: '8e3ebe8cceca34ac140929be70cbf29c9feccce630527a7b3268ed4b4b113f3b',
    extractTo: 'libsodium',
    marker: 'libsodium/build/libsodium-apple/ios/lib/libsodium.a',
    // The 1.5.0 archive ships the per-platform static libraries but not the
    // Clibsodium.xcframework its podspec references, so it is assembled from
    // those (already hash-verified) libraries. Headers are left out: CocoaPods'
    // xcframework copy phase fails on them, and the Podfile points the pod's
    // header search path at the unpacked `ios/include` instead.
    afterExtract: root => {
      const apple = path.join(root, 'libsodium/build/libsodium-apple');
      const xcframework = path.join(apple, 'Clibsodium.xcframework');
      if (process.platform !== 'darwin' || existsSync(xcframework)) {
        return;
      }
      execFileSync(
        'xcodebuild',
        [
          '-create-xcframework',
          '-library', path.join(apple, 'ios/lib/libsodium.a'),
          '-library', path.join(apple, 'ios-simulators/lib/libsodium.a'),
          '-output', xcframework,
        ],
        {stdio: 'inherit'},
      );
    },
  },
];

let failed = false;

for (const entry of ARCHIVES) {
  const pkgJson = require.resolve(`${entry.pkg}/package.json`, {paths: [path.join(__dirname, '..')]});
  const root = path.dirname(pkgJson);
  const {version} = JSON.parse(readFileSync(pkgJson, 'utf8'));

  if (version !== entry.version) {
    console.error(`${entry.pkg}: expected ${entry.version}, found ${version}; review its archive and update the pin.`);
    failed = true;
    continue;
  }

  const archive = path.join(root, entry.archive);
  const digest = createHash('sha256').update(readFileSync(archive)).digest('hex');
  if (digest !== entry.sha256) {
    console.error(`${entry.pkg}: ${entry.archive} hash ${digest} does not match the pinned ${entry.sha256}.`);
    failed = true;
    continue;
  }

  if (!existsSync(path.join(root, entry.marker))) {
    execFileSync('tar', ['-xzf', archive, '--directory', path.join(root, entry.extractTo)], {
      stdio: 'inherit',
    });
  }
  entry.afterExtract?.(root);
  console.log(`${entry.pkg}@${version}: archive verified and unpacked.`);
}

process.exit(failed ? 1 : 0);
