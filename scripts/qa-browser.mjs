import { mkdir, copyFile } from "node:fs/promises";

const OUT = "/Users/kunkun/.adk/release/workspaces/gemini/baby-beat-heaven/qa-shots";
await mkdir(OUT, { recursive: true });

const task = await taskSpace("baby-beat-heaven QA");
const page = task.page("p1");

await page.goto("file:///Users/kunkun/.adk/release/workspaces/gemini/baby-beat-heaven/index.html");
await page.waitForFunction(() => Boolean(window.__BBH), undefined, { timeout: 8000 });

await page.evaluate(() => {
  window.__QA_ERRORS = [];
  window.addEventListener("error", (e) => window.__QA_ERRORS.push("ERR: " + e.message));
  window.addEventListener("unhandledrejection", (e) => window.__QA_ERRORS.push("REJ: " + String(e.reason)));
});

const snap = async (name) => {
  const shotPath = await page.screenshot();
  if (typeof shotPath === "string") {
    await copyFile(shotPath, `${OUT}/${name}`);
  }
  console.log("Captured", name, "->", `${OUT}/${name}`);
};

// 1. Title screen
await page.waitForTimeout(350);
await snap("01-title.png");

// 2. Enter Menu (check vibrant stage-theme gradient + Mascot!)
await page.mouse.click(640, 600, { label: "Start game from title" });
await page.waitForTimeout(550);
await snap("02-menu.png");

// 3. Stage 1 Title Card
await page.evaluate(() => {
  const app = window.__BBH;
  app.startStage("pacifier", true, false);
  app.stateTime = 1.9;
});
await page.waitForTimeout(100);
await snap("03-titlecard.png");

// 4. Stage 1 Practice
await page.evaluate(() => {
  window.__BBH.startPractice();
});
await page.waitForTimeout(250);
await snap("04-practice.png");

// 5. Stage 1 Live Gameplay (Pacifier mid-flight!)
await page.evaluate(() => {
  const app = window.__BBH;
  app.botMode = "perfect";
  app.startMainPlay();
  app.vis.babyExpr = "spit";
  app.vis.pacifiers = [{ startBeat: 5, targetBeat: 6, isLob: true, golden: true, done: false }];
  app.songStartTime = app.audio.now() - (5.55 * (60 / app.stage.bpm));
  app.lastEighthScheduled = 10;
  app.nextCueIdx = 6;
});
await page.waitForTimeout(120);
await snap("05-stage1-pacifier.png");

// 6. Stage 2 Burp Orchestra (mid-burp glow!)
await page.evaluate(() => {
  const app = window.__BBH;
  app.startStage("burp", false, false);
  app.startMainPlay();
  app.vis.babyExpr = "burp_boom";
  app.vis.babyBelly.set(0.4);
  app.particles.spawnBubble(680, 310, 34, 40, -140);
  app.particles.spawnBubble(730, 270, 24, 60, -120);
  app.particles.spawnComicText(680, 220, "꺼억!!", "#FFE156", 58);
});
await page.waitForTimeout(100);
await snap("06-stage2-burp.png");

// 7. Stage 3 Peek-a-Boo Studio (angel pose + beaming Polaroid!)
await page.evaluate(() => {
  const app = window.__BBH;
  app.startStage("photo", false, false);
  app.startMainPlay();
  app.vis.babyExpr = "sparkle";
  app.vis.dadExpr = "thumbsup";
  app.vis.photoSnapshots = [
    { x: 320, y: 240, rot: -0.15, good: true, label: "인생샷!", age: 0.3 },
    { x: 960, y: 245, rot: 0.14, good: true, label: "완벽해!", age: 0.3 },
  ];
});
await page.waitForTimeout(100);
await snap("07-stage3-photo.png");

// 8. Stage 4 3AM Ninja Escape (one-leg crane freeze pose!)
await page.evaluate(() => {
  const app = window.__BBH;
  app.startStage("ninja", false, false);
  app.startMainPlay();
  app.vis.ninjaSteps = 14;
  app.vis.ninjaFrozen = true;
  app.vis.ninjaMonitorAlert = 0.8;
});
await page.waitForTimeout(100);
await snap("08-stage4-ninja.png");

// 9. Stage 5 Grand Remix Finale with Rainbow God-Rays!
await page.evaluate(() => {
  const app = window.__BBH;
  app.startStage("remix", false, false);
  app.startMainPlay();
  app.activeSubStage = "ninja";
  app.vis.ninjaSteps = 30;
  app.vis.ninjaDoorOpen = 1;
  app.vis.dadExpr = "thumbsup";
  app.cam.godRaysRainbow = true;
  app.cam.godRays = 0.95;
  app.cam.godRaysTarget = 0.95;
  app.particles.spawnConfetti(640, 260, 40, 420);
});
await page.waitForTimeout(100);
await snap("09-stage5-remix.png");

// 10. Result 5-Step Epilogue
await page.evaluate(() => {
  const app = window.__BBH;
  app.startStage("pacifier", false, false);
  app.startMainPlay();
  app.perfectCount = 20;
  app.goodCount = 1;
  app.missCount = 0;
  app.skillStarGot = true;
  app.enterResult();
  app.stateTime = 3.8;
  app._triggerResultStamp();
  app.resultStampSpring.set(1);
});
await page.waitForTimeout(180);
await snap("10-result-epilogue.png");

// 11. Settings Overlay (clean!)
await page.evaluate(() => {
  window.__BBH.openSettings();
});
await page.waitForTimeout(120);
await snap("11-settings.png");

// 12. Real-time Perfect Bot mini-run (verify audio scheduler + real judgement hit cleanly!)
const botCheck = await page.evaluate(async () => {
  const app = window.__BBH;
  app.botMode = "perfect";
  app.startStage("pacifier", false, false);
  app.startMainPlay();
  await new Promise((r) => setTimeout(r, 3800));
  const judged = app.chart.events.filter((e) => e.judged);
  return {
    state: app.state,
    beat: Number(app.currentBeat.toFixed(2)),
    judgedCount: judged.length,
    perfectCount: app.perfectCount,
    missCount: app.missCount,
    errors: window.__QA_ERRORS,
  };
});

console.log("QA SUMMARY:", JSON.stringify(botCheck));
await task.finish({ keep: "all" });
