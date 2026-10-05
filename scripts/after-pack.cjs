// electron-builder afterPack hook.
//
// Without a Developer ID we can't properly sign the macOS build, and an
// unsigned (or signature-broken) arm64 binary is killed on launch by Apple
// Silicon Macs. Re-seal the bundle with an ad-hoc signature so it runs; users
// still have to get past Gatekeeper once (see README).
const { execFileSync } = require('node:child_process');
const path = require('node:path');

exports.default = async function afterPack(ctx) {
  if (ctx.electronPlatformName !== 'darwin') return;
  const app = path.join(ctx.appOutDir, `${ctx.packager.appInfo.productFilename}.app`);
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
};
