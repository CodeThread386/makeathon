// Renders the live 3D board (the phone camera) at a series of azimuths, with a transparent background:
// one PNG per pose. The page's own drag handling does the turning, so the poses match what a visitor sees.
//
//   npm i --no-save playwright-core        # a Chrome or Chromium must be installed
//   npm start                              # in another terminal: serves http://localhost:8000
//   node scripts/hero-frames/capture.mjs out-dir
//   python3 scripts/hero-frames/encode.py out-dir hero     # needs Pillow; writes hero/board-NN.webp
//
// CHROME defaults to /usr/bin/google-chrome; BASE defaults to http://localhost:8000.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2] || 'hero-frames-out';
const BASE = process.env.BASE || 'http://localhost:8000';
const N = 12, STEP = 0.0775;        // 25 poses, 4.4 degrees apart, either side of the home pose
const RAD_PER_PX = 0.0042;          // the page's orbit speed while dragging
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: true,
  args: ['--use-gl=angle', '--use-angle=gl-egl', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],   // a real GPU, so the phone path (html.mk-ph3d) runs
});
// wide enough for the whole drag; reduced motion keeps the scene still (calm mode), so every pose reads the same sensor value
const ctx = await browser.newContext({ viewport: { width: 760, height: 1000 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
const page = await ctx.newPage();
// reduced motion normally keeps a phone on the 2D layout; this capture asks for the 3D one anyway
await page.route(BASE + '/', async (route) => {
  const res = await route.fetch();
  const body = (await res.text()).replace("&& !matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('mk-ph3d')", ") document.documentElement.classList.add('mk-ph3d')");
  await route.fulfill({ response: res, body });
});
await page.goto(BASE + '/', { waitUntil: 'load' });
await page.waitForTimeout(7000);
if (!(await page.evaluate(() => document.documentElement.classList.contains('mk-ph3d')))) throw new Error('the live 3D phone path did not start (no GPU?)');
await page.addStyleTag({ content: `
html,body,.k-root,.mk-desktop-theater,.mk-desktop-theater>div{background:transparent!important}
.k-root>*:not(.mk-desktop-theater){display:none!important}
.mk-desktop-theater>div>*:not(.k-clip){display:none!important}
.k-clip canvas:not(.k-cvs){display:none!important}
.k-mat{display:none!important}
.k-cvs{opacity:1!important}` });

const x0 = 380, y0 = 330;           // a point on the board that is not the sensor
await page.mouse.move(x0, y0);
await page.mouse.down();
await page.mouse.move(x0 + 12, y0, { steps: 2 });
await page.mouse.move(x0, y0, { steps: 2 });
await page.waitForTimeout(700);
for (let i = -N; i <= N; i++) {
  const a = i * STEP;
  await page.mouse.move(x0 + a / RAD_PER_PX, y0, { steps: 6 });
  await page.waitForTimeout(650);
  await page.screenshot({ path: `${OUT}/f${String(i + N).padStart(2, '0')}.png`, omitBackground: true });
}
await page.mouse.up();
await browser.close();
console.log(`wrote ${2 * N + 1} poses to ${OUT}`);
