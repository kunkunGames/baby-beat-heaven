// 5 Bespoke 7-Layer Cinematic Stage Renderers + 5 Bespoke 3.2s Title Card Mini-Animations
// Each stage renders:
//   [L0] Sky / Atmosphere -> [L1] Volumetric Light Beams -> [L2] Distant Parallax
//   [L3] Midground Beat-Reactive Props -> [L4] Ground & Contact Shadows
//   [L5] Rigged Cel-Shaded Characters -> [L6] Foreground Framing Silhouettes -> [L7] Minimal "나" Tag

class StageVisualState {
  constructor() {
    this.reset();
  }
  reset() {
    this.babyExpr = "happy";
    this.babyExprTimer = 0;
    this.dadExpr = "tired";
    this.dadExprTimer = 0;
    this.dadHand = new Spring(0, 320, 18);
    this.babyBounce = new Spring(0, 260, 14);
    this.babyCheek = new Spring(0, 220, 14);
    this.babyBelly = new Spring(0, 140, 12);
    this.fanOpen = new Spring(0, 260, 16);
    this.dadBump = false;
    this.pacifiers = []; // active arcing pacifiers
    this.photoSnapshots = []; // floating instant polaroids snapped during Stage 3
    this.photoFlashText = "";
    this.photoFlashTimer = 0;
    this.photoSide = 0; // -1 left, 0 center, 1 right
    this.sleepyDad = false;
    this.ninjaSteps = 0;
    this.ninjaFrozen = false;
    this.ninjaDuckSquish = 0;
    this.ninjaDoorOpen = 0;
    this.ninjaMonitorAlert = 0;
    this.shhMode = 0;
    this.holding = false;
    this.fever = 0; // 0..1 rises with combo streak
    this.skillStarActive = false;
    this.skillStarBanner = 0;
    this.finale = false;
  }
  update(dt) {
    const s = Math.min(dt, 0.05);
    this.dadHand.update(s);
    this.babyBounce.update(s);
    this.babyCheek.update(s);
    this.babyBelly.update(s);
    this.fanOpen.update(s);
    if (this.babyExprTimer > 0) {
      this.babyExprTimer -= s;
      if (this.babyExprTimer <= 0 && !this.holding && !this.finale) this.babyExpr = "happy";
    }
    if (this.dadExprTimer > 0) {
      this.dadExprTimer -= s;
      if (this.dadExprTimer <= 0 && !this.ninjaFrozen && !this.finale) {
        this.dadExpr = "tired";
        this.dadBump = false;
      }
    }
    if (this.photoFlashTimer > 0) this.photoFlashTimer -= s;
    if (this.ninjaDuckSquish > 0) this.ninjaDuckSquish = Math.max(0, this.ninjaDuckSquish - s * 2.5);
    if (this.ninjaMonitorAlert > 0) this.ninjaMonitorAlert = Math.max(0, this.ninjaMonitorAlert - s * 1.4);
    if (this.skillStarBanner > 0) this.skillStarBanner = Math.max(0, this.skillStarBanner - s);
    this.shhMode = Math.max(0, this.shhMode - s * 0.7);
    for (let i = this.photoSnapshots.length - 1; i >= 0; i--) {
      this.photoSnapshots[i].age += s;
      if (this.photoSnapshots[i].age > 2.2) this.photoSnapshots.splice(i, 1);
    }
  }
}

// =========================================================================
// STAGE 1: 쪽쪽이 스나이퍼 (7-Layer Crescent Moon Nursery)
// =========================================================================
function drawPacifierStage(ctx, beat, vis, cam) {
  const bPulse = Math.pow(Math.max(0, 1 - (beat % 1) * 2.2), 2);
  const fever = vis.fever;

  // [L0] Deep starry crescent moon night sky seen through grand window
  const wallGrad = ctx.createLinearGradient(0, 0, 0, H);
  wallGrad.addColorStop(0, "#24194A");
  wallGrad.addColorStop(0.65, "#3E2A6E");
  wallGrad.addColorStop(1, "#2A1B47");
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle pastel nursery wallpaper stripes & stars
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.035)";
  for (let x = 0; x < W; x += 64) ctx.fillRect(x, 0, 28, H);
  ctx.restore();

  // Grand arched nursery window (right-center background)
  const wx = 780, wy = 62, ww = 350, wh = 290;
  ctx.save();
  roundRectPath(ctx, wx, wy, ww, wh, 32);
  ctx.clip();
  const skyGrad = ctx.createLinearGradient(wx, wy, wx, wy + wh);
  skyGrad.addColorStop(0, "#0D1238");
  skyGrad.addColorStop(1, "#2D357A");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(wx, wy, ww, wh);
  // Twinkling stars dancing to beat!
  for (let i = 0; i < 16; i++) {
    const sx = wx + 28 + ((i * 73) % (ww - 56));
    const sy = wy + 24 + ((i * 47) % (wh - 90));
    const sr = 2.5 + ((i % 3) === 0 ? 2 : 0) + (i % 2 === 0 ? bPulse * 2.5 : 0);
    ctx.fillStyle = i % 3 === 0 ? "#FFE156" : "#FFFFFF";
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
  }
  // Glowing crescent moon
  ctx.save();
  ctx.translate(wx + 245, wy + 92);
  ctx.rotate(Math.sin(beat * 0.4) * 0.08);
  ctx.fillStyle = "#FFF199";
  ctx.beginPath(); ctx.arc(0, 0, 44, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#192056";
  ctx.beginPath(); ctx.arc(16, -10, 38, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // Distant night rooftops silhouette
  ctx.fillStyle = "#181B45";
  ctx.fillRect(wx, wy + 220, ww, 80);
  ctx.fillRect(wx + 20, wy + 185, 65, 50);
  ctx.fillRect(wx + 120, wy + 170, 82, 60);
  ctx.fillRect(wx + 235, wy + 195, 70, 40);
  ctx.restore();
  // Window frame & sill
  roundRectPath(ctx, wx, wy, ww, wh, 32);
  ctx.lineWidth = 8; ctx.strokeStyle = "#5B428A"; ctx.stroke();
  ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(wx + ww * 0.5, wy); ctx.lineTo(wx + ww * 0.5, wy + wh);
  ctx.moveTo(wx, wy + wh * 0.55); ctx.lineTo(wx + ww, wy + wh * 0.55);
  ctx.lineWidth = 6; ctx.strokeStyle = "#5B428A"; ctx.stroke();

  // [L1] Volumetric diagonal moonlight shaft through window!
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const beam = ctx.createLinearGradient(wx + 200, wy + 60, 420, 620);
  beam.addColorStop(0, `rgba(210, 225, 255, ${0.18 + fever * 0.1})`);
  beam.addColorStop(1, "rgba(180, 200, 255, 0)");
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(wx + 40, wy + 40);
  ctx.lineTo(wx + ww - 20, wy + 40);
  ctx.lineTo(540, H);
  ctx.lineTo(140, H);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // [L2/L3] Rotating hanging nursery cloud & star mobile (spins faster in Fever!)
  const mobX = 640;
  ctx.save();
  ctx.translate(mobX, 0);
  ctx.strokeStyle = INK; ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 68); ctx.stroke();
  const spin = beat * (0.65 + fever * 0.6);
  ctx.beginPath(); ctx.moveTo(-115, 68); ctx.lineTo(115, 68); ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const ang = spin + (i * Math.PI * 2) / 3;
    const mx = Math.cos(ang) * 98;
    const my = 112 + Math.sin(ang) * 14;
    ctx.beginPath(); ctx.moveTo(mx, 68); ctx.lineTo(mx, my); ctx.stroke();
    drawStarPath(ctx, mx, my + 8, 5, 18, 8);
    ctx.fillStyle = ["#FFE156", "#FF8FA3", "#7CE8FF"][i];
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  // Floor & cozy circular rug
  ctx.fillStyle = "#332257";
  ctx.fillRect(0, 495, W, H - 495);
  ctx.beginPath();
  ctx.moveTo(0, 495); ctx.lineTo(W, 495);
  ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(680, 560, 420, 74, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#6B4E9B";
  ctx.fill();
  ctx.stroke();

  // Glowing sheep nightlight on left nightstand (pulses with music!)
  ctx.save();
  ctx.translate(155, 442);
  roundRectPath(ctx, -46, 0, 92, 90, 12);
  ctx.fillStyle = "#6D4A8C"; ctx.fill(); ctx.stroke();
  const ng = ctx.createRadialGradient(0, -24, 5, 0, -24, 72 + bPulse * 18);
  ng.addColorStop(0, "rgba(255, 240, 160, 0.72)");
  ng.addColorStop(1, "rgba(255, 220, 120, 0)");
  ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(0, -24, 78, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -20, 24, 0, Math.PI * 2);
  ctx.fillStyle = "#FFF7CC"; ctx.fill(); ctx.stroke();
  ctx.restore();

  // [L4] Wooden Crib (back rail + mattress + bouncing plush bear!)
  const cribX = 680, cribY = 390;
  drawContactShadow(ctx, cribX, 535, 245, 36, 0.35);
  // Back headboard
  roundRectPath(ctx, cribX - 220, cribY - 88, 440, 165, 26);
  ctx.fillStyle = "#E8B57C"; ctx.fill(); ctx.stroke();
  // Soft mint crib mattress
  roundRectPath(ctx, cribX - 204, cribY + 12, 408, 72, 18);
  ctx.fillStyle = "#A9F0E2"; ctx.fill(); ctx.stroke();

  // Cute plush teddy bear in crib corner bouncing on beat!
  ctx.save();
  ctx.translate(cribX + 146, cribY - 12 - bPulse * 12);
  ctx.rotate(Math.sin(beat * Math.PI) * 0.08);
  ctx.fillStyle = "#C98556";
  ctx.beginPath(); ctx.arc(-16, -24, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(16, -24, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, -8, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, 20, 20, 18, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(-7, -10, 3, 0, Math.PI * 2); ctx.arc(7, -10, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // [L5] Articulated Baby inside the crib!
  const babySquash = vis.babyBounce.val;
  const hasPaci = vis.pacifiers.every((p) => p.done) && vis.babyExpr !== "spit" && vis.babyExpr !== "giggle";
  drawBaby(ctx, {
    x: cribX - 10,
    y: cribY - 26 - bPulse * 9 + babySquash * 14,
    scale: 1.18,
    sx: 1 + babySquash * 0.14,
    sy: 1 - babySquash * 0.14,
    expr: vis.babyExpr,
    cheekInflation: clamp(vis.babyCheek.val, 0, 1),
    armL: -0.5 + Math.sin(beat * Math.PI) * 0.35,
    armR: -0.5 - Math.sin(beat * Math.PI) * 0.35,
    hasPacifier: hasPaci,
    hairLag: Math.sin(beat * Math.PI) * 0.18,
    onesie: "#7CE8FF",
    shadow: false,
  });

  // Crib front wooden slats (layering Baby cleanly INSIDE the crib!)
  ctx.fillStyle = "#F5C792";
  ctx.lineWidth = 4; ctx.strokeStyle = INK;
  roundRectPath(ctx, cribX - 224, cribY + 46, 448, 20, 10); ctx.fill(); ctx.stroke();
  for (let sxp = -196; sxp <= 196; sxp += 49) {
    roundRectPath(ctx, cribX + sxp - 7, cribY + 56, 14, 72, 6);
    ctx.fillStyle = "#E8B57C"; ctx.fill(); ctx.stroke();
  }
  roundRectPath(ctx, cribX - 224, cribY + 114, 448, 24, 10);
  ctx.fillStyle = "#D49B63"; ctx.fill(); ctx.stroke();

  // Arcing perspective pacifiers flying from Baby toward Foreground Dad!
  for (const p of vis.pacifiers) {
    if (p.done) continue;
    const t = clamp((beat - p.startBeat) / Math.max(0.25, p.targetBeat - p.startBeat), 0, 1.35);
    const sx0 = cribX - 10;
    const sy0 = cribY - 46;
    const tx = 415 + (p.lane || 0) * 65;
    const ty = 520;
    const arcH = p.isLob ? 320 : 185;
    const px = lerp(sx0, tx, t);
    const py = lerp(sy0, ty, t) - Math.sin(clamp(t, 0, 1) * Math.PI) * arcH;
    const pScale = lerp(0.78, p.isLob ? 2.55 : 2.0, clamp(t, 0, 1.15));
    // Speed motion trail!
    if (t > 0.08 && t < 1.1) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      drawPacifier(ctx, lerp(sx0, tx, t - 0.09), lerp(sy0, ty, t - 0.09) - Math.sin(clamp(t - 0.09, 0, 1) * Math.PI) * arcH, pScale * 0.86, t * 14 - 1, p.golden);
      ctx.restore();
    }
    drawPacifier(ctx, px, py, pScale, t * (p.isLob ? 18 : 13), p.golden);
  }

  // [L6] Foreground Over-the-Shoulder Pajama Dad + Framing Silhouette!
  drawDad(ctx, {
    x: 245,
    y: 575 + bPulse * 6,
    scale: 1.16,
    mode: "ots",
    expr: vis.dadExpr,
    handAction: vis.dadHand.val,
  });

  // Foreground right lamp-shade framing silhouette for deep 7-layer cinema lens feel!
  ctx.save();
  ctx.fillStyle = "#160D2B";
  ctx.beginPath();
  ctx.moveTo(W + 20, H + 20);
  ctx.lineTo(W - 140, H + 20);
  ctx.quadraticCurveTo(W - 95, H - 150, W + 20, H - 220);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // [L7] Ultra-minimal Rhythm Heaven "나" tag near Dad's hand
  drawYouTag(ctx, 245, 682, bPulse);
}

// =========================================================================
// STAGE 2: 꺼억! 트림 오케스트라 (7-Layer Warm Jazz Living Room)
// =========================================================================
function drawBurpStage(ctx, beat, vis) {
  const bPulse = Math.pow(Math.max(0, 1 - (beat % 1) * 2.2), 2);
  const rock = Math.sin(beat * Math.PI * 0.5) * 0.06;

  // [L0] Warm amber midnight living room backdrop
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#3D1D1E");
  bg.addColorStop(0.65, "#6E352B");
  bg.addColorStop(1, "#45211D");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle music-staff wallpaper pattern
  ctx.save();
  ctx.strokeStyle = "rgba(255, 224, 165, 0.06)";
  ctx.lineWidth = 2;
  for (let row = 0; row < 4; row++) {
    const base = 70 + row * 155;
    for (let l = 0; l < 5; l++) {
      ctx.beginPath(); ctx.moveTo(0, base + l * 10); ctx.lineTo(W, base + l * 10); ctx.stroke();
    }
  }
  ctx.restore();

  // [L1] Warm floor-lamp cone & stage spotlight glow!
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const lampG = ctx.createRadialGradient(230, 210, 15, 230, 320, 420);
  lampG.addColorStop(0, `rgba(255, 224, 140, ${0.42 - vis.shhMode * 0.18})`);
  lampG.addColorStop(1, "rgba(255, 180, 90, 0)");
  ctx.fillStyle = lampG;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // [L2/L3] Vintage Jazz Vinyl Player on right shelf + Standing Floor Lamp on left!
  // Floor lamp
  ctx.strokeStyle = INK; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(225, 215); ctx.lineTo(225, 580); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(160, 230); ctx.lineTo(188, 130); ctx.lineTo(262, 130); ctx.lineTo(290, 230); ctx.closePath();
  ctx.fillStyle = "#FFD166"; ctx.fill(); ctx.stroke();

  // Jazz vinyl shelf (right) — turntable spins with beat!
  roundRectPath(ctx, 920, 355, 240, 195, 16);
  ctx.fillStyle = "#8B4A32"; ctx.fill(); ctx.stroke();
  // Spinning vinyl record
  ctx.save();
  ctx.translate(1030, 336);
  ctx.beginPath(); ctx.ellipse(0, 0, 74, 22, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#1E162B"; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, 0, 22, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#FF5D8F"; ctx.fill();
  // Bouncing equalizer bars on vintage amp!
  for (let i = 0; i < 6; i++) {
    const bh = 16 + Math.abs(Math.sin(beat * Math.PI + i * 0.9)) * 34 * (1 - vis.shhMode * 0.7);
    ctx.fillStyle = i % 2 === 0 ? "#FFE156" : "#FF8FA3";
    ctx.fillRect(-78 + i * 26, 95 - bh, 18, bh);
  }
  ctx.restore();

  // Floor
  ctx.fillStyle = "#4A231D";
  ctx.fillRect(0, 545, W, H - 545);
  ctx.beginPath(); ctx.moveTo(0, 545); ctx.lineTo(W, 545); ctx.lineWidth = 4; ctx.stroke();

  // [L4] Contact shadow under rocking chair
  drawContactShadow(ctx, 640, 625, 230, 34, 0.36);

  // [L5] Centerpiece: Wood-Slat Rocking Chair + Striped Pajama Dad + Baby Facing Camera!
  ctx.save();
  ctx.translate(640, 595);
  ctx.rotate(rock);

  // Curved wooden rocker rails + chair legs
  ctx.strokeStyle = INK; ctx.lineWidth = 4.5;
  ctx.fillStyle = "#A45334";
  roundRectPath(ctx, -135, -75, 24, 90, 8); ctx.fill(); ctx.stroke();
  roundRectPath(ctx, 111, -75, 24, 90, 8); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-215, 16);
  ctx.quadraticCurveTo(0, 56, 215, 16);
  ctx.lineWidth = 18; ctx.strokeStyle = INK; ctx.stroke();
  ctx.lineWidth = 10; ctx.strokeStyle = "#C97542"; ctx.stroke();

  // Wooden slatted chair backrest + plush tufted cushion
  ctx.lineWidth = 4.5; ctx.strokeStyle = INK;
  roundRectPath(ctx, -195, -370, 390, 305, 48);
  ctx.fillStyle = "#9C4A2F"; ctx.fill(); ctx.stroke();
  roundRectPath(ctx, -162, -338, 324, 242, 36);
  ctx.fillStyle = "#EFA56A"; ctx.fill(); ctx.stroke();
  // Armrests
  roundRectPath(ctx, -212, -135, 62, 26, 12); ctx.fillStyle = "#B5603B"; ctx.fill(); ctx.stroke();
  roundRectPath(ctx, 150, -135, 62, 26, 12); ctx.fill(); ctx.stroke();

  // Dad's broad striped pajama torso + loving profile head!
  roundRectPath(ctx, -168, -210, 265, 175, 68);
  ctx.fillStyle = "#485E9B"; ctx.fill(); ctx.stroke();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = "#627BBD";
  for (let xp = -160; xp <= 110; xp += 28) ctx.fillRect(xp, -220, 12, 200);
  ctx.restore();
  ctx.stroke();

  // Cozy cream burp cloth draped over Dad's right shoulder!
  roundRectPath(ctx, -26, -218, 138, 148, 26);
  ctx.fillStyle = "#FFF7EC"; ctx.fill(); ctx.stroke();

  // Dad's profile face leaning gently near Baby!
  ctx.save();
  ctx.translate(-112, -234);
  ctx.beginPath(); ctx.arc(0, 0, 52, 0, Math.PI * 2);
  ctx.fillStyle = "#F7CAA8"; ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.arc(-8, -10, 53, Math.PI * 0.65, Math.PI * 1.92);
  ctx.quadraticCurveTo(30, -48, 14, -26);
  ctx.quadraticCurveTo(-8, -32, -26, 16);
  ctx.closePath();
  ctx.fillStyle = "#31243D"; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(24, -2, 8, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  ctx.beginPath(); ctx.arc(22, 16, 10, 0.1 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  ctx.restore();

  // Articulated Baby perched OVER Dad's shoulder looking directly at the player!
  const bSq = vis.babyBounce.val;
  const swell = clamp(vis.babyBelly.val, 0, 1);
  drawBaby(ctx, {
    x: 42,
    y: -178 + bSq * 15 - bPulse * 6,
    scale: 1.46,
    sx: 1 + bSq * 0.14 + swell * 0.1,
    sy: 1 - bSq * 0.12 + swell * 0.08,
    expr: vis.babyExpr,
    onesie: "#FFE156",
    onesieTrim: "#FF7597",
    bellyInflation: swell,
    cheekInflation: swell * 0.9,
    armL: -0.35 + Math.sin(beat * Math.PI) * 0.2,
    armR: -0.35 - Math.sin(beat * Math.PI) * 0.2,
    shadow: false,
  });

  // Dad's expressive patting hand on Baby's back/side!
  const patPush = vis.dadHand.val;
  ctx.save();
  ctx.translate(166 - patPush * 44, -122 - patPush * 12);
  ctx.rotate(-0.32 - patPush * 0.35);
  if (vis.holding) {
    ctx.beginPath();
    ctx.arc(0, 0, 56 + Math.sin(beat * 14) * 8, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 225, 86, 0.38)";
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(0, 0, 36, 28, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#F7CAA8"; ctx.fill(); ctx.stroke();
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.ellipse(-28, i * 11, 14, 7, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  }
  ctx.restore();
  ctx.restore(); // end rocking group

  // Gentle floating "쉿~" golden hush aura during Rest fakeout
  if (vis.shhMode > 0.05) {
    ctx.save();
    ctx.globalAlpha = clamp(vis.shhMode, 0, 1);
    drawStrokedText(ctx, "쉿~ ♪", 640, 118 - (1 - vis.shhMode) * 18, 54, "#B5F8FF", INK, 9);
    ctx.restore();
  }

  // [L6] Foreground framing botanical fern leaves (depth framing!)
  ctx.save();
  ctx.fillStyle = "#220D10";
  for (const [bx, dir] of [[0, 1], [W, -1]]) {
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.translate(bx, H + 10);
      ctx.rotate(dir * (0.28 + i * 0.28));
      ctx.beginPath();
      ctx.ellipse(0, -110, 34, 120, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();

  // [L7] Minimal "나" tag near Dad's patting hand
  drawYouTag(ctx, 815, 590, bPulse);
}

// =========================================================================
// STAGE 3: 까꿍! 백일 사진관 (7-Layer Pastel Korean 100-Day Photo Studio)
// =========================================================================
function drawPhotoStage(ctx, beat, vis) {
  const bPulse = Math.pow(Math.max(0, 1 - (beat % 1) * 2.2), 2);

  // [L0] Cheerful pastel sunburst cyclorama backdrop
  const bg = ctx.createRadialGradient(640, 340, 60, 640, 360, 820);
  bg.addColorStop(0, "#FFF6DE");
  bg.addColorStop(0.6, "#FFD6E0");
  bg.addColorStop(1, "#FFA8C5");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Rotating pastel studio rays
  ctx.save();
  ctx.translate(640, 380);
  ctx.rotate(beat * 0.08);
  ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
  for (let i = 0; i < 14; i++) {
    ctx.rotate((Math.PI * 2) / 14);
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-34, -900); ctx.lineTo(34, -900); ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // [L1] Dual studio softbox diagonal light shafts
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const sx of [160, 1120]) {
    const g = ctx.createLinearGradient(sx, 0, 640, 500);
    g.addColorStop(0, "rgba(255, 255, 240, 0.34)");
    g.addColorStop(1, "rgba(255, 255, 240, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(sx - 60, 0); ctx.lineTo(sx + 60, 0);
    ctx.lineTo(640 + (sx < 640 ? 220 : -220), 620);
    ctx.lineTo(640 + (sx < 640 ? -180 : 180), 620);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // [L2/L3] Swaying "100일" pastel garland banners & giant balloons!
  ctx.save();
  ctx.strokeStyle = INK; ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(80, 42);
  ctx.quadraticCurveTo(640, 148 + bPulse * 10, 1200, 42);
  ctx.stroke();
  const flags = ["★", "1", "0", "0", "일", "축", "하", "★"];
  const fCols = ["#FF6B8B", "#FFD93D", "#6BCB77", "#4D96FF", "#C77DFF", "#FF9F1C", "#FF6B8B", "#4D96FF"];
  for (let i = 0; i < flags.length; i++) {
    const t = (i + 0.5) / flags.length;
    const fx = lerp(120, 1160, t);
    const fy = 42 + 4 * t * (1 - t) * (106 + bPulse * 10);
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(Math.sin(beat * Math.PI + i) * 0.07);
    ctx.beginPath();
    ctx.moveTo(-28, 0); ctx.lineTo(28, 0); ctx.lineTo(0, 56); ctx.closePath();
    ctx.fillStyle = fCols[i]; ctx.fill(); ctx.stroke();
    drawStrokedText(ctx, flags[i], 0, 20, 22, "#FFFFFF", INK, 4);
    ctx.restore();
  }
  ctx.restore();

  // Studio cyclorama floor
  ctx.fillStyle = "#FFF0F5";
  ctx.fillRect(0, 505, W, H - 505);
  ctx.beginPath(); ctx.moveTo(0, 505); ctx.lineTo(W, 505); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();

  // [L4] Royal velvet tufted cushion bench with wooden legs + Contact shadow
  drawContactShadow(ctx, 640, 608, 255, 30, 0.22);
  ctx.fillStyle = "#D49B63"; ctx.lineWidth = 4.5; ctx.strokeStyle = INK;
  roundRectPath(ctx, 448, 550, 26, 56, 8); ctx.fill(); ctx.stroke();
  roundRectPath(ctx, 806, 550, 26, 56, 8); ctx.fill(); ctx.stroke();
  roundRectPath(ctx, 415, 455, 450, 112, 44);
  ctx.fillStyle = "#FF6B9D"; ctx.fill(); ctx.stroke();
  roundRectPath(ctx, 438, 470, 404, 42, 20);
  ctx.fillStyle = "#FF99BA"; ctx.fill();
  // Cute plush star pillow beside Baby
  drawStarPath(ctx, 480, 466 - bPulse * 5, 5, 30, 15);
  ctx.fillStyle = "#FFE156"; ctx.fill(); ctx.stroke();

  // [L5] Sleepy Exhausted Dad sitting on bench right edge (wakes up on snap!)
  drawDad(ctx, {
    x: 825,
    y: 448 + (vis.sleepyDad ? Math.sin(beat * 2) * 8 : 0),
    scale: 0.96,
    mode: "front",
    expr: vis.dadExpr === "thumbsup" ? "thumbsup" : vis.sleepyDad ? "sleep" : "happy",
  });

  // Bouncing Studio Photographer darting Left/Right/Center!
  const phX = 285 + (vis.photoSide === 1 ? 710 : vis.photoSide === -1 ? -40 : 0);
  drawPhotographer(ctx, {
    x: phX,
    y: 442,
    scale: 1.08,
    fanOpen: clamp(vis.fanOpen.val, 0, 1),
    bounce: -bPulse * 14,
    side: vis.photoSide,
    expr: vis.fanOpen.val < 0.25 ? "boo" : "cheer",
  });

  // Star of the show: Baby on velvet cushion!
  const bSq = vis.babyBounce.val;
  drawBaby(ctx, {
    x: 610,
    y: 416 - bPulse * 12 + bSq * 14,
    scale: 1.32,
    sx: 1 + bSq * 0.14,
    sy: 1 - bSq * 0.12,
    expr: vis.babyExpr,
    onesie: "#FFF5B8",
    onesieTrim: "#FF6B9D",
    crown: true,
    handsOnCheeks: vis.babyExpr === "sparkle",
    armL: -0.6 + Math.sin(beat * Math.PI) * 0.35,
    armR: -0.6 - Math.sin(beat * Math.PI) * 0.35,
    shadow: false,
  });

  // Floating Polaroid snapshots popped out from recent snaps!
  for (const snap of vis.photoSnapshots) {
    const t = snap.age / 2.2;
    ctx.save();
    ctx.globalAlpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
    ctx.translate(snap.x, snap.y - t * 90);
    ctx.rotate(snap.rot);
    const sc = snap.age < 0.18 ? Ease.outBack(snap.age / 0.18) : 1;
    ctx.scale(sc, sc);
    roundRectPath(ctx, -56, -64, 112, 128, 10);
    ctx.fillStyle = "#FFFFFF"; ctx.fill();
    ctx.lineWidth = 3.5; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = snap.good ? "#FFE8A3" : "#6D6288";
    ctx.fillRect(-46, -54, 92, 82);
    drawStrokedText(ctx, snap.good ? "★" : "💤", 0, -13, 38, snap.good ? "#FF4D79" : "#FFFFFF", INK, 4);
    drawStrokedText(ctx, snap.label, 0, 46, 15, INK, "#FFFFFF", 0);
    ctx.restore();
  }

  // [L6] Clean minimalist Camera Viewfinder Framing Brackets (Zero clutter, super cinematic!)
  ctx.save();
  ctx.strokeStyle = "rgba(38, 25, 44, 0.55)";
  ctx.lineWidth = 6;
  const m = 42, L = 44;
  // 4 corners
  const corners = [
    [m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1],
  ];
  for (const [cx, cy, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx + dx * L, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + dy * L);
    ctx.stroke();
  }
  // Subtle center focus bracket pulsing on beat
  ctx.strokeStyle = vis.babyExpr === "sparkle" ? "#FFE156" : "rgba(255, 255, 255, 0.75)";
  ctx.lineWidth = 3;
  const fr = 66 - bPulse * 6;
  ctx.strokeRect(610 - fr, 382 - fr, fr * 2, fr * 2);
  ctx.restore();

  // [L7] Minimal "나" tag at bottom-center shutter indicator
  drawYouTag(ctx, 640, 668, bPulse);
}

// =========================================================================
// STAGE 4: 새벽 3시! 닌자 육퇴 탈출 (7-Layer 1-Point Perspective Stealth Hallway)
// =========================================================================
function drawNinjaStage(ctx, beat, vis) {
  const bPulse = Math.pow(Math.max(0, 1 - (beat % 1) * 2.2), 2);
  const progress = clamp(vis.ninjaSteps / 34, 0, 1);

  // [L0] Deep midnight hallway perspective walls
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#121633");
  bg.addColorStop(1, "#222A54");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 1-point perspective hallway geometry toward the glowing GOLDEN EXIT DOOR!
  const vpX = 640, vpY = 290;
  // Left & Right walls with perspective framed family photos & glowing hallway sconces!
  ctx.fillStyle = "#1E254D";
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(vpX - 180, vpY - 140); ctx.lineTo(vpX - 180, vpY + 170); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(vpX + 180, vpY - 140); ctx.lineTo(vpX + 180, vpY + 170); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  // Perspective wall frames & soft blue wall sconces
  ctx.save();
  ctx.lineWidth = 4; ctx.strokeStyle = "#3A4680"; ctx.fillStyle = "#293466";
  ctx.beginPath(); ctx.moveTo(110, 150); ctx.lineTo(250, 195); ctx.lineTo(250, 375); ctx.lineTo(110, 420); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(315, 210); ctx.lineTo(405, 232); ctx.lineTo(405, 360); ctx.lineTo(315, 382); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(1170, 150); ctx.lineTo(1030, 195); ctx.lineTo(1030, 375); ctx.lineTo(1170, 420); ctx.closePath(); ctx.fill(); ctx.stroke();
  // Baseboards
  ctx.strokeStyle = "#4A5899"; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(vpX - 180, vpY + 170); ctx.moveTo(W, H); ctx.lineTo(vpX + 180, vpY + 170); ctx.stroke();
  ctx.restore();

  // Wooden plank floor scrolling smoothly with every stealth step!
  ctx.fillStyle = "#3E2E4D";
  ctx.beginPath();
  ctx.moveTo(vpX - 180, vpY + 170);
  ctx.lineTo(vpX + 180, vpY + 170);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  // Perspective floorboard lines scrolling!
  ctx.strokeStyle = "rgba(18, 12, 30, 0.55)";
  ctx.lineWidth = 3;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(vpX + i * 56, vpY + 170);
    ctx.lineTo(vpX + i * 240, H);
    ctx.stroke();
  }
  const scrollOff = (vis.ninjaSteps * 0.35) % 1;
  for (let j = 0; j < 6; j++) {
    const k = ((j + scrollOff) / 6) ** 1.6;
    const fy = lerp(vpY + 170, H, k);
    ctx.beginPath(); ctx.moveTo(0, fy); ctx.lineTo(W, fy); ctx.stroke();
  }

  // [L1/L2] THE LEGENDARY EXIT DOOR ("자유시간 · 치킨 & 게임") getting closer!
  const doorScale = lerp(0.72, 1.38, progress);
  ctx.save();
  ctx.translate(vpX, vpY + 18);
  ctx.scale(doorScale, doorScale);

  // Golden freedom glow spilling around the door cracks!
  const glowR = 220 + vis.ninjaDoorOpen * 260;
  const dg = ctx.createRadialGradient(0, 0, 20, 0, 0, glowR);
  dg.addColorStop(0, `rgba(255, 226, 110, ${0.42 + vis.ninjaDoorOpen * 0.55})`);
  dg.addColorStop(1, "rgba(255, 200, 80, 0)");
  ctx.fillStyle = dg;
  ctx.beginPath(); ctx.arc(0, 0, glowR, 0, Math.PI * 2); ctx.fill();

  // Door frame
  roundRectPath(ctx, -84, -124, 168, 250, 12);
  ctx.fillStyle = "#FFF1A8"; ctx.fill();
  ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();

  // Door panel (swings open on finale!)
  ctx.save();
  ctx.translate(-76, 0);
  ctx.scale(1 - vis.ninjaDoorOpen * 0.85, 1);
  roundRectPath(ctx, 0, -116, 152, 236, 8);
  ctx.fillStyle = "#7D5340"; ctx.fill(); ctx.stroke();
  roundRectPath(ctx, 18, -94, 116, 84, 6);
  ctx.fillStyle = "#664030"; ctx.fill(); ctx.stroke();
  // Gleaming brass doorknob
  ctx.beginPath(); ctx.arc(128, 12, 11, 0, Math.PI * 2);
  ctx.fillStyle = "#FFE156"; ctx.fill(); ctx.stroke();
  ctx.restore();

  // Neon freedom sign above door!
  roundRectPath(ctx, -78, -162, 156, 32, 16);
  ctx.fillStyle = "#162044"; ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = "#72EFDD"; ctx.stroke();
  drawStrokedText(ctx, "자유시간 EXIT", 0, -146, 18, "#FFE156", INK, 3);
  ctx.restore();

  // [L3] Dangerous Squeaky Rubber Ducks along hallway floor!
  drawRubberDuck(ctx, 355, 565, 1.15, vis.ninjaDuckSquish);
  drawRubberDuck(ctx, 935, 585, 1.25, vis.ninjaDuckSquish);

  // [L4/L5] Stealth Pajama Ninja Dad tiptoeing right down the center!
  const dadY = 505 - bPulse * 14;
  drawContactShadow(ctx, 640, 616, 76, 18, 0.42);
  drawDad(ctx, {
    x: 640 + Math.sin(vis.ninjaSteps * 1.6) * 26,
    y: dadY,
    scale: 1.38,
    mode: "ninja",
    expr: vis.ninjaFrozen ? "crane" : vis.dadExpr,
    stepPhase: vis.ninjaSteps * 1.8,
    ninjaBand: true,
  });

  // Picture-in-Picture BABY MONITOR CAM (top-right, pulses red on Freeze/Miss!)
  ctx.save();
  const monX = 990, monY = 44, monW = 242, monH = 170;
  roundRectPath(ctx, monX, monY, monW, monH, 20);
  ctx.fillStyle = vis.ninjaMonitorAlert > 0.2 ? "#3D182A" : "#15262E";
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = vis.ninjaMonitorAlert > 0.2 ? "#FF4D79" : "#72EFDD";
  ctx.stroke();

  ctx.save();
  roundRectPath(ctx, monX + 6, monY + 6, monW - 12, monH - 12, 14);
  ctx.clip();
  // Night-vision scanlines
  ctx.fillStyle = "rgba(114, 239, 221, 0.06)";
  for (let sy = monY; sy < monY + monH; sy += 8) ctx.fillRect(monX, sy, monW, 3);
  drawBaby(ctx, {
    x: monX + monW * 0.5,
    y: monY + monH * 0.62,
    scale: 0.72,
    expr: vis.ninjaMonitorAlert > 0.5 ? "shock" : vis.ninjaFrozen ? "mischievous" : "sleepy",
    onesie: "#72EFDD",
    shadow: false,
  });
  ctx.restore();
  // Monitor status badge
  ctx.fillStyle = vis.ninjaMonitorAlert > 0.2 ? "#FF4D79" : "#6BCB77";
  ctx.beginPath(); ctx.arc(monX + 24, monY + 24, 7, 0, Math.PI * 2); ctx.fill();
  drawStrokedText(ctx, vis.ninjaFrozen ? "뒤척임!!" : "BABY CAM", monX + 122, monY + 24, 17, "#FFFFFF", INK, 3);
  ctx.restore();

  // [L6] Foreground framing dark doorframe edges
  ctx.fillStyle = "#0B0D21";
  ctx.fillRect(0, 0, 38, H);
  ctx.fillRect(W - 38, 0, 38, H);

  // [L7] Minimal "나" tag under Ninja Dad
  drawYouTag(ctx, 640, 668, bPulse);
}

// Glowing cartoon eyes rendered OVER the pitch-black blackout in Stage 4!
function drawNinjaBlackoutEyes(ctx, alpha, beat, vis) {
  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);
  const dx = 640 + Math.sin(vis.ninjaSteps * 1.6) * 26;
  const dy = 432;
  // Dad's tense glowing white cartoon eyes in the pitch dark!
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(dx + s * 22, dy, 13, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(dx + s * 22 + Math.sin(beat * Math.PI) * 3, dy, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = INK;
    ctx.fill();
  }
  // Faint glowing "Zzz..." floating in top-right monitor corner
  const zBob = Math.sin(beat * 2) * 8;
  drawStrokedText(ctx, "Zzz...", 1110, 126 + zBob, 28, "#72EFDD", "#000000", 4);
  ctx.restore();
}

// =========================================================================
// 5 BESPOKE 3.2-SECOND CINEMATIC TITLE CARD ANIMATIONS
// =========================================================================
function drawTitleCard(ctx, stage, elapsed, totalDur) {
  const t = clamp(elapsed / totalDur, 0, 1);
  const titlePop = t > 0.45 ? Ease.outBack((t - 0.45) / 0.24, 2.2) : 0;

  // Stage-specific cinematic backdrop
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, stage.themeTop);
  bg.addColorStop(1, stage.themeBot);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  if (stage.id === "pacifier") {
    // Glowing crescent moon + spinning pacifier curving from distant moon to foreground landing!
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    for (let i = 0; i < 28; i++) {
      ctx.beginPath();
      ctx.arc((i * 197) % W, (i * 113) % H, 2 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    // Authentic geometric crescent moon (no background color mismatch!)
    ctx.save();
    ctx.translate(960, 190);
    ctx.rotate(-0.3);
    ctx.beginPath();
    ctx.arc(0, 0, 92, 0.25 * Math.PI, 1.75 * Math.PI, false);
    ctx.arc(38, 0, 74, 1.62 * Math.PI, 0.38 * Math.PI, true);
    ctx.closePath();
    ctx.fillStyle = "#FFF199";
    ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
    ctx.restore();

    // 3D curved fly-in like Rhythm Heaven's Frisbee title card!
    const ft = clamp(t / 0.52, 0, 1);
    const e = Ease.inOutCubic(ft);
    const px = lerp(960, 310, e) + Math.sin(ft * Math.PI) * 160;
    const py = lerp(190, 480, e) - Math.sin(ft * Math.PI) * 210;
    const sc = lerp(0.35, 3.1, e);
    drawPacifier(ctx, px, py, sc, ft * 16, true);
    if (ft > 0.35 && ft < 0.55) {
      // Lens glint star!
      drawStarPath(ctx, px + 24, py - 24, 4, 48 * Math.sin(((ft - 0.35) / 0.2) * Math.PI), 10);
      ctx.fillStyle = "#FFFFFF"; ctx.fill();
    }
  } else if (stage.id === "burp") {
    // Big-band velvet spotlight + rising iridescent giant soap bubble popping on Beat 4!
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const sp = ctx.createRadialGradient(640, 340, 20, 640, 340, 460);
    sp.addColorStop(0, "rgba(255, 224, 130, 0.45)");
    sp.addColorStop(1, "rgba(255, 160, 80, 0)");
    ctx.fillStyle = sp; ctx.fillRect(0, 0, W, H);
    ctx.restore();

    const bt = clamp(t / 0.46, 0, 1);
    if (t < 0.48) {
      const r = lerp(24, 155, Ease.outBack(bt));
      const g = ctx.createRadialGradient(610, 310, 10, 640, 340, r);
      g.addColorStop(0, "rgba(255,255,255,0.9)");
      g.addColorStop(0.55, "rgba(180,240,255,0.4)");
      g.addColorStop(1, "rgba(255,180,235,0.65)");
      ctx.beginPath(); ctx.arc(640, lerp(590, 340, Ease.outCubic(bt)), r, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill();
      ctx.lineWidth = 5; ctx.strokeStyle = "#FFFFFF"; ctx.stroke();
    } else {
      // Musical notes exploding from popped bubble!
      const pt = clamp((t - 0.48) / 0.4, 0, 1);
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8 + 0.3;
        const d = Ease.outCubic(pt) * 280;
        drawStrokedText(ctx, i % 2 ? "♪" : "♫", 640 + Math.cos(a) * d, 340 + Math.sin(a) * d, 46, "#FFE156", INK, 6);
      }
    }
  } else if (stage.id === "photo") {
    // Rotating studio aperture blades opening + blinding flash popping instant photo!
    ctx.save();
    ctx.translate(640, 360);
    const open = Ease.outExpo(clamp(t / 0.5, 0, 1));
    ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.fillRect(-18, 60 + open * 200, 36, 480);
    }
    ctx.restore();
    // Spinning white Polaroid frame landing!
    const sc = Ease.outBack(clamp(t / 0.48, 0, 1));
    ctx.save();
    ctx.translate(640, 345);
    ctx.rotate(lerp(-0.45, -0.05, Ease.outCubic(clamp(t / 0.48, 0, 1))));
    ctx.scale(sc, sc);
    roundRectPath(ctx, -230, -180, 460, 360, 22);
    ctx.fillStyle = "#FFFFFF"; ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = "#FFE5EE";
    ctx.fillRect(-205, -155, 410, 260);
    drawBaby(ctx, { x: 0, y: 12, scale: 1.22, expr: "sparkle", handsOnCheeks: true, crown: true, shadow: false });
    ctx.restore();
  } else if (stage.id === "ninja") {
    // Spy spotlight sweeping across dark hallway and freezing Ninja Dad!
    const sweepX = lerp(220, 640, Ease.outCubic(clamp(t / 0.45, 0, 1)));
    ctx.fillStyle = "#0A0C1D";
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.arc(sweepX, 370, 215, 0, Math.PI * 2);
    ctx.clip();
    const lg = ctx.createRadialGradient(sweepX, 370, 20, sweepX, 370, 215);
    lg.addColorStop(0, "#3D4B8C");
    lg.addColorStop(1, "#181E42");
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, W, H);
    drawDad(ctx, { x: 640, y: 400, scale: 1.5, mode: "ninja", expr: "crane", ninjaBand: true });
    ctx.restore();
    ctx.beginPath();
    ctx.arc(sweepX, 370, 215, 0, Math.PI * 2);
    ctx.lineWidth = 6; ctx.strokeStyle = "rgba(114, 239, 221, 0.7)"; ctx.stroke();
  } else {
    // GRAND REMIX: Spinning 4-quadrant rainbow prism & all stars converging!
    ctx.save();
    ctx.translate(640, 360);
    ctx.rotate(t * 2.2);
    const cols = ["#FF5D8F", "#FF9F1C", "#00B4D8", "#7B2CBF"];
    for (let i = 0; i < 16; i++) {
      ctx.rotate(Math.PI / 8);
      ctx.fillStyle = cols[i % 4];
      ctx.globalAlpha = 0.35;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-42, -900); ctx.lineTo(42, -900); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    const s = Ease.outBack(clamp(t / 0.45, 0, 1));
    drawBaby(ctx, { x: 640, y: 290, scale: 1.35 * s, expr: "sparkle", crown: true, handsOnCheeks: true, onesie: "#FFE156", shadow: false });
  }

  // Bold cel-shaded Title & Genre Pill landing right on Beat 4!
  if (titlePop > 0.01) {
    ctx.save();
    ctx.translate(640, 560);
    ctx.scale(titlePop, titlePop);
    // Pill genre tag
    roundRectPath(ctx, -180, -96, 360, 42, 21);
    ctx.fillStyle = INK; ctx.fill();
    ctx.lineWidth = 3.5; ctx.strokeStyle = stage.accent; ctx.stroke();
    drawStrokedText(ctx, `STAGE ${stage.number}  ·  ${stage.genre}`, 0, -75, 20, stage.accent, INK, 0);
    // Giant bold cel-shaded title
    drawStrokedText(ctx, stage.title, 0, -8, 76, "#FFFFFF", INK, 16);
    drawStrokedText(ctx, stage.subtitle, 0, 56, 26, "#FFF3B0", INK, 7);
    ctx.restore();
  }
}

function renderStageWorld(ctx, subStage, beat, vis, cam) {
  if (subStage === "pacifier") drawPacifierStage(ctx, beat, vis, cam);
  else if (subStage === "burp") drawBurpStage(ctx, beat, vis, cam);
  else if (subStage === "photo") drawPhotoStage(ctx, beat, vis, cam);
  else drawNinjaStage(ctx, beat, vis, cam);
}
