// Generate real Bubblewrap project without CLI toolchain setup.
// Refuses to overwrite an existing Android project or signing material.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { TwaManifest, TwaGenerator, ConsoleLog } = require('@bubblewrap/core');
(async () => {
  const target = path.resolve('twa-app');
  const web = JSON.parse(await fs.readFile('public/manifest.json', 'utf8'));
  const m = TwaManifest.fromWebManifestJson(new URL('https://data.mcky.space/manifest.json'), web);
  m.packageId = 'com.mcky.ezzylist';
  m.enableNotifications = false;
  m.signingKey = { path: './android.keystore', alias: 'android' };
  m.generatorApp = 'bubblewrap-cli';
  const error = m.validate();
  if (error) throw new Error(error);
  await fs.mkdir(target);
  await new TwaGenerator().createTwaProject(target, m, new ConsoleLog('generate'));
  const manifest = path.join(target, 'twa-manifest.json');
  await m.saveToFile(manifest);
  await fs.writeFile(path.join(target, 'manifest-checksum.txt'), crypto.createHash('sha1').update(await fs.readFile(manifest)).digest('hex'));
  for (const file of ['gradlew', 'gradle/wrapper/gradle-wrapper.jar', 'app/build.gradle', 'app/src/main/AndroidManifest.xml']) {
    const s = await fs.stat(path.join(target, file));
    if (!s.size) throw new Error(`Empty generated file: ${file}`);
    console.log('Generated:', file, s.size, 'bytes');
  }
  console.log('Android sources generated. NO APK and NO signing key created.');
})().catch(error => { console.error(error); process.exitCode = 1; });
