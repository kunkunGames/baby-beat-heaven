// Cel-Shaded Hierarchical Character Rigging, Mascot, and 15 Bespoke Epilogue Comic Illustrations

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawStrokedText(ctx, text, x, y, size, fill = "#FFFFFF", stroke = INK, strokeW = 7, align = "center", font = FONT_MAIN) {
  ctx.save();
  ctx.font = `900 ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if (strokeW > 0) {
    ctx.lineWidth = strokeW;
    ctx.strokeStyle = stroke;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawContactShadow(ctx, x, y, rx, ry, alpha = 0.28) {
  ctx.save();
  ctx.fillStyle = `rgba(26, 16, 42, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Minimal Rhythm Heaven player indicator ("나")
function drawYouTag(ctx, x, y, pulse = 0) {
  ctx.save();
  const s = 1 + pulse * 0.08;
  ctx.translate(x, y);
  ctx.scale(s, s);
  roundRectPath(ctx, -28, -16, 56, 32, 16);
  ctx.fillStyle = "#FF4D79";
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = "#FFFFFF";
  ctx.stroke();
  drawStrokedText(ctx, "나", 0, 1, 20, "#FFFFFF", INK, 4);
  ctx.restore();
}

// Reusable Pacifier prop (can spin, scale in perspective, glow gold for Skill Star)
function drawPacifier(ctx, x, y, scale = 1, rot = 0, golden = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);

  if (golden) {
    ctx.save();
    const glow = ctx.createRadialGradient(0, 0, 6, 0, 0, 44);
    glow.addColorStop(0, "rgba(255, 240, 130, 0.72)");
    glow.addColorStop(0.55, "rgba(255, 220, 90, 0.28)");
    glow.addColorStop(1, "rgba(255, 220, 90, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Silicone nipple (pointing right/up)
  ctx.beginPath();
  ctx.ellipse(14, 0, 14, 9, 0, 0, Math.PI * 2);
  ctx.fillStyle = golden ? "#FFF5B8" : "#FFE7A0";
  ctx.fill();
  ctx.lineWidth = 3.2;
  ctx.strokeStyle = INK;
  ctx.stroke();

  // Shield plate
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 21, 0, 0, Math.PI * 2);
  ctx.fillStyle = golden ? "#FFD43B" : "#FF6B9D";
  ctx.fill();
  ctx.stroke();

  // Cel highlight on shield
  ctx.beginPath();
  ctx.ellipse(-3, -7, 4, 8, -0.2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fill();

  // Center knob
  ctx.beginPath();
  ctx.arc(-6, 0, 8.5, 0, Math.PI * 2);
  ctx.fillStyle = golden ? "#FFF099" : "#FFE156";
  ctx.fill();
  ctx.stroke();

  // Handle ring
  ctx.beginPath();
  ctx.arc(-18, 0, 11, 0, Math.PI * 2);
  ctx.lineWidth = 5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = golden ? "#FFF6C8" : "#FFFFFF";
  ctx.stroke();

  ctx.restore();
}

// Reusable squeaky rubber duck prop
function drawRubberDuck(ctx, x, y, scale = 1, squished = 0) {
  ctx.save();
  ctx.translate(x, y);
  const sx = scale * (1 + squished * 0.38);
  const sy = scale * (1 - squished * 0.34);
  ctx.scale(sx, sy);

  // Body
  ctx.beginPath();
  ctx.ellipse(0, 8, 22, 14, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#FFD93D";
  ctx.fill();
  ctx.lineWidth = 3.2;
  ctx.strokeStyle = INK;
  ctx.stroke();

  // Head
  ctx.beginPath();
  ctx.arc(-10, -8, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Beak
  ctx.beginPath();
  ctx.ellipse(-23, -6, 7, 4.2, -0.1, 0, Math.PI * 2);
  ctx.fillStyle = "#FF7B29";
  ctx.fill();
  ctx.stroke();

  // Eye
  ctx.beginPath();
  ctx.arc(-14, -10, 2.8, 0, Math.PI * 2);
  ctx.fillStyle = INK;
  ctx.fill();

  // Wing
  ctx.beginPath();
  ctx.ellipse(5, 8, 9, 5, -0.25, 0, Math.PI * 2);
  ctx.fillStyle = "#FFC422";
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

// =========================================================================
// ARTICULATED CEL-SHADED BABY RIG
// =========================================================================
function drawBaby(ctx, opts = {}) {
  const {
    x = 640, y = 420,
    scale = 1,
    sx = 1, sy = 1,
    rot = 0,
    expr = "happy", // happy | mischievous | puff | spit | bliss | sleepy | burp_charge | burp_boom | sparkle | shock | giggle
    onesie = "#7CE8FF",
    onesieTrim = "#FFE156",
    armL = 0, // radians
    armR = 0,
    hasPacifier = false,
    pacifierGolden = false,
    cheekInflation = 0, // 0..1
    bellyInflation = 0, // 0..1
    blink = false,
    hairLag = 0,
    crown = false,
    handsOnCheeks = false,
    shadow = true,
  } = opts;

  ctx.save();
  if (shadow) drawContactShadow(ctx, x, y + 66 * scale, 56 * scale, 16 * scale, 0.25);

  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale * sx, scale * sy);

  // Chubby legs / feet
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * 24, 48);
    ctx.rotate(side * 0.22);
    ctx.beginPath();
    ctx.ellipse(0, 6, 15, 11, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#FFD7BA";
    ctx.fill();
    ctx.stroke();
    // Little sock
    ctx.beginPath();
    ctx.ellipse(side * 4, 8, 10, 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = onesieTrim;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Onesie Torso (expands with bellyInflation during Burp Hold!)
  const bw = 42 + bellyInflation * 14;
  const bh = 38 + bellyInflation * 10;
  ctx.beginPath();
  ctx.ellipse(0, 22, bw, bh, 0, 0, Math.PI * 2);
  ctx.fillStyle = onesie;
  ctx.fill();
  ctx.stroke();

  // Cel shadow on onesie bottom
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 22, bw - 2, bh - 2, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "rgba(38, 25, 44, 0.12)";
  ctx.beginPath();
  ctx.ellipse(8, 36, bw, bh * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Cute bib with star badge
  ctx.beginPath();
  ctx.moveTo(-24, -4);
  ctx.quadraticCurveTo(0, 30, 24, -4);
  ctx.closePath();
  ctx.fillStyle = "#FFF9F0";
  ctx.fill();
  ctx.stroke();
  drawStarPath(ctx, 0, 7, 5, 7, 3.2);
  ctx.fillStyle = onesieTrim;
  ctx.fill();

  // Arms (either animated waving or hands-on-cheeks pose!)
  if (!handsOnCheeks) {
    for (const [side, ang] of [[-1, armL], [1, armR]]) {
      ctx.save();
      ctx.translate(side * (bw - 6), 8);
      ctx.rotate(side * (0.45 + ang));
      roundRectPath(ctx, -11, -8, 22, 32, 11);
      ctx.fillStyle = onesie;
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 22, 10.5, 0, Math.PI * 2);
      ctx.fillStyle = "#FFD7BA";
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  // Oversized expressive head
  ctx.save();
  ctx.translate(0, -34);

  // Cute round ears
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(side * 54, 4, 13, 0, Math.PI * 2);
    ctx.fillStyle = "#FFD7BA";
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(side * 54, 4, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#F5B89E";
    ctx.fill();
  }

  // Head base (widens slightly when cheeks puff)
  const headRx = 56 + cheekInflation * 8;
  const headRy = 50 + cheekInflation * 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, headRx, headRy, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#FFE0C8";
  ctx.fill();
  ctx.stroke();

  // Warm rim highlight on forehead
  ctx.beginPath();
  ctx.ellipse(-18, -26, 20, 10, -0.35, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.fill();

  // Iconic springy baby hair curl on top!
  ctx.save();
  ctx.translate(0, -49);
  ctx.rotate(hairLag);
  ctx.beginPath();
  ctx.moveTo(-4, 4);
  ctx.bezierCurveTo(-18, -22, 14, -32, 14, -10);
  ctx.bezierCurveTo(14, -2, 2, 0, 4, -8);
  ctx.lineWidth = 4.5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.restore();

  if (crown) {
    ctx.save();
    ctx.translate(0, -56);
    ctx.beginPath();
    ctx.moveTo(-22, 6);
    ctx.lineTo(-26, -16);
    ctx.lineTo(-10, -4);
    ctx.lineTo(0, -22);
    ctx.lineTo(10, -4);
    ctx.lineTo(26, -16);
    ctx.lineTo(22, 6);
    ctx.closePath();
    ctx.fillStyle = "#FFD93D";
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.restore();
  }

  // Rosy cheeks (puff out hugely on puff/burp_charge!)
  const blushR = 11 + cheekInflation * 9 + (expr === "burp_charge" ? 6 : 0);
  const blushAlpha = expr === "burp_charge" || expr === "puff" ? 0.8 : 0.48;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * (33 + cheekInflation * 4), 12, blushR, blushR * 0.72, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 108, 138, ${blushAlpha})`;
    ctx.fill();
    if (cheekInflation > 0.35) {
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = "rgba(180, 60, 88, 0.5)";
      ctx.stroke();
    }
  }

  // EYES & BROWS
  const eyeY = -4;
  for (const side of [-1, 1]) {
    const ex = side * 22;
    ctx.save();
    ctx.translate(ex, eyeY);
    if (blink || expr === "bliss" || expr === "giggle") {
      // Happy curved ^ ^
      ctx.beginPath();
      ctx.arc(0, 4, 10, Math.PI * 1.12, Math.PI * 1.88);
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = INK;
      ctx.lineCap = "round";
      ctx.stroke();
    } else if (expr === "sleepy") {
      // Peaceful closed U U
      ctx.beginPath();
      ctx.arc(0, -2, 10, Math.PI * 0.15, Math.PI * 0.85);
      ctx.lineWidth = 4.2;
      ctx.strokeStyle = INK;
      ctx.lineCap = "round";
      ctx.stroke();
    } else if (expr === "shock") {
      // Huge wide-awake comic eyes!
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = INK;
      ctx.fill();
    } else if (expr === "sparkle") {
      // Radiant star-shine eyes!
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fillStyle = INK;
      ctx.fill();
      drawStarPath(ctx, -2, -2, 4, 8, 3);
      ctx.fillStyle = "#FFE156";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(4, 4, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
    } else if (expr === "burp_charge") {
      // Tightly squeezed > < eyes!
      ctx.beginPath();
      ctx.moveTo(-side * 7, -6);
      ctx.lineTo(side * 6, 0);
      ctx.lineTo(-side * 7, 6);
      ctx.lineWidth = 4.2;
      ctx.strokeStyle = INK;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    } else {
      // Expressive shiny cartoon eyes
      ctx.beginPath();
      ctx.ellipse(0, 0, 9, 10.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = INK;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-3, -3.5, 3.6, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(3, 3, 1.8, 0, Math.PI * 2);
      ctx.fill();
      if (expr === "mischievous") {
        // Smug angled eyebrow
        ctx.beginPath();
        ctx.moveTo(-10, -14 + side * 2);
        ctx.lineTo(10, -14 - side * 5);
        ctx.lineWidth = 3.8;
        ctx.strokeStyle = INK;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // MOUTH
  ctx.save();
  ctx.translate(0, 17);
  ctx.lineWidth = 3.8;
  ctx.strokeStyle = INK;
  ctx.lineCap = "round";
  if (expr === "puff") {
    // Tight puckered cheek-puff mouth
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.quadraticCurveTo(0, -4, 7, 0);
    ctx.stroke();
  } else if (expr === "spit") {
    // Round O blasting mouth!
    ctx.beginPath();
    ctx.arc(0, 2, 10, 0, Math.PI * 2);
    ctx.fillStyle = "#D6456B";
    ctx.fill();
    ctx.stroke();
  } else if (expr === "burp_boom") {
    // Giant jubilant belch mouth!
    ctx.beginPath();
    ctx.ellipse(0, 3, 18, 15, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#B82B54";
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 11, 10, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#FF8FA3";
    ctx.fill();
  } else if (expr === "shock") {
    ctx.beginPath();
    ctx.ellipse(0, 4, 13, 11, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#D6456B";
    ctx.fill();
    ctx.stroke();
  } else if (expr === "sleepy") {
    ctx.beginPath();
    ctx.ellipse(0, 3, 6, 4.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#F07A96";
    ctx.fill();
    ctx.stroke();
  } else if (expr === "mischievous") {
    ctx.beginPath();
    ctx.moveTo(-13, 0);
    ctx.quadraticCurveTo(2, 12, 16, -4);
    ctx.stroke();
  } else if (expr === "burp_charge") {
    ctx.beginPath();
    ctx.moveTo(-10, 2);
    ctx.bezierCurveTo(-4, -4, 4, 8, 10, 2);
    ctx.stroke();
  } else {
    // Big joyful beaming baby smile with cute tiny tooth!
    ctx.beginPath();
    ctx.arc(0, -2, 14, 0.12 * Math.PI, 0.88 * Math.PI);
    ctx.closePath();
    ctx.fillStyle = "#E8557A";
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(-4, 2, 8, 4.5);
  }
  ctx.restore();

  if (hasPacifier) {
    drawPacifier(ctx, 0, 20, 0.92, Math.PI, pacifierGolden);
  }

  // Angelic "hands-on-cheeks" studio pose!
  if (handsOnCheeks) {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * 44, 18, 14, 0, Math.PI * 2);
      ctx.fillStyle = "#FFD7BA";
      ctx.fill();
      ctx.lineWidth = 3.8;
      ctx.strokeStyle = INK;
      ctx.stroke();
    }
  }

  ctx.restore(); // end head
  ctx.restore(); // end baby
}

// =========================================================================
// ARTICULATED CEL-SHADED PAJAMA DAD RIG
// =========================================================================
function drawDad(ctx, opts = {}) {
  const {
    x = 300, y = 500,
    scale = 1,
    sx = 1, sy = 1,
    rot = 0,
    mode = "front", // front | ots | ninja | sleepy | victory
    expr = "tired", // tired | focus | happy | shock | bonk | sleep | thumbsup | crane
    handAction = 0, // 0..1 punch/catch/pat extension
    stepPhase = 0,
    ninjaBand = false,
    bump = false,
  } = opts;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale * sx, scale * sy);
  ctx.lineWidth = 4.2;
  ctx.strokeStyle = INK;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  if (mode === "ots") {
    // Over-the-shoulder foreground pajama Dad (Stage 1 Pacifier Sniper!)
    // Back/shoulders silhouette with warm stripes
    ctx.beginPath();
    ctx.ellipse(0, 115, 130, 125, 0, Math.PI, Math.PI * 2);
    ctx.lineTo(130, 210);
    ctx.lineTo(-130, 210);
    ctx.closePath();
    ctx.fillStyle = "#3D4F85";
    ctx.fill();
    ctx.stroke();
    // Pajama stripes
    ctx.save();
    ctx.clip();
    ctx.fillStyle = "#5369A8";
    for (let sxp = -120; sxp <= 120; sxp += 34) {
      ctx.fillRect(sxp, -20, 14, 240);
    }
    ctx.restore();
    ctx.stroke();

    // Head (turned 3/4 toward crib, shakes or shows forehead bump if bonked!)
    ctx.save();
    ctx.translate(-12, -26);
    // Warm ear on side
    ctx.beginPath();
    ctx.arc(-44, 8, 12, 0, Math.PI * 2);
    ctx.fillStyle = "#F2BC98"; ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 0, 54, 56, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#F7CAA8";
    ctx.fill();
    ctx.stroke();
    // Friendly soft cel-shaded bedhead hair (no spiky receding artifacts!)
    ctx.beginPath();
    ctx.arc(-8, -10, 56, Math.PI * 0.65, Math.PI * 1.92);
    ctx.quadraticCurveTo(36, -54, 18, -32);
    ctx.quadraticCurveTo(4, -46, -12, -32);
    ctx.quadraticCurveTo(-26, -12, -34, 24);
    ctx.closePath();
    ctx.fillStyle = "#31243D";
    ctx.fill();
    ctx.stroke();
    // Cute sleepy ahoge cowlick tuft on crown!
    ctx.beginPath();
    ctx.moveTo(-10, -64);
    ctx.quadraticCurveTo(-2, -88, 18, -74);
    ctx.quadraticCurveTo(2, -70, -2, -62);
    ctx.fill();
    ctx.stroke();

    // Cute side nose + warm cheek
    ctx.beginPath();
    ctx.arc(48, 8, 7, -0.45 * Math.PI, 0.45 * Math.PI);
    ctx.fillStyle = "#F7CAA8"; ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(24, 18, 9, 5.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 118, 145, 0.35)"; ctx.fill();

    // Side profile eye / reaction
    if (expr === "bonk") {
      // Comic red lump on head + dizzy spiral eye
      ctx.beginPath();
      ctx.arc(38, -28, 17, 0, Math.PI * 2);
      ctx.fillStyle = "#FF5C77";
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(26, -4); ctx.lineTo(38, 6);
      ctx.moveTo(38, -4); ctx.lineTo(26, 6);
      ctx.lineWidth = 4;
      ctx.stroke();
    } else if (expr === "happy") {
      ctx.beginPath();
      ctx.arc(32, -2, 8, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(33, -2, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = INK;
      ctx.fill();
      // Tired Dad eye bag
      ctx.beginPath();
      ctx.arc(33, 5, 8, 0.1 * Math.PI, 0.85 * Math.PI);
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = "rgba(80, 50, 95, 0.55)";
      ctx.stroke();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 4.2;
    }
    ctx.restore();

    // Expressive foreground catching hand!
    ctx.save();
    const reachX = 115 + handAction * 110;
    const reachY = 24 - handAction * 92;
    ctx.translate(reachX, reachY);
    ctx.rotate(-0.45 + handAction * 0.45);
    // Forearm sleeve
    roundRectPath(ctx, -95, -18, 95, 38, 16);
    ctx.fillStyle = "#3D4F85";
    ctx.fill();
    ctx.stroke();
    // Open/snatching palm
    ctx.beginPath();
    ctx.ellipse(16, 0, 26, 22, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#F7CAA8";
    ctx.fill();
    ctx.stroke();
    // Fingers
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.ellipse(34, i * 10, 12, 6, i * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
    return;
  }

  // Full / Half-body Dad (Ninja, Sleepy, Victory, Front)
  if (mode === "ninja") {
    // Pajama legs cleanly anchored at hip joints (never detaching during crane pose!)
    const isCrane = expr === "crane";
    for (const side of [-1, 1]) {
      ctx.save();
      const hipX = side * 18;
      const hipY = 50;
      ctx.translate(hipX, hipY);
      if (isCrane && side === 1) {
        // Hilarious bent-knee one-leg ninja crane freeze!
        ctx.rotate(-1.05);
        roundRectPath(ctx, -12, -4, 24, 34, 10);
        ctx.fillStyle = "#3D4F85"; ctx.fill(); ctx.stroke();
        ctx.translate(0, 26);
        ctx.rotate(1.35);
        roundRectPath(ctx, -11, -4, 22, 30, 10);
        ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(6, 26, 17, 9, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#FF8FA3"; ctx.fill(); ctx.stroke();
      } else {
        const sw = isCrane ? 0 : Math.sin(stepPhase + (side > 0 ? Math.PI : 0));
        ctx.rotate(sw * 0.28);
        roundRectPath(ctx, -13, -4, 26, 56, 12);
        ctx.fillStyle = "#3D4F85"; ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(side * 6, 54, 18, 9, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#FF8FA3"; ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    }
  } else {
    // Grounded slippers/legs for front/victory/sleepy modes so Dad never looks like a floating capsule
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(side * 22, 62, 18, 10, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#FF8FA3"; ctx.fill(); ctx.stroke();
    }
  }

  // Torso (striped pajamas)
  roundRectPath(ctx, -46, -12, 92, 74, 28);
  ctx.fillStyle = "#485E9B";
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = "#627BBD";
  for (let xp = -42; xp <= 42; xp += 22) ctx.fillRect(xp, -15, 9, 80);
  ctx.restore();
  ctx.stroke();
  // Collar
  ctx.beginPath();
  ctx.moveTo(-18, -12); ctx.lineTo(0, 8); ctx.lineTo(18, -12);
  ctx.fillStyle = "#FFF7EA";
  ctx.fill();
  ctx.stroke();

  // Expressive arms for non-ninja modes
  if (mode === "ninja") {
    const spread = expr === "crane" ? 1.25 : 0.45 + Math.sin(stepPhase) * 0.3;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * 42, 4);
      ctx.rotate(side * (-spread));
      roundRectPath(ctx, -11, -8, 22, 46, 11);
      ctx.fillStyle = "#485E9B";
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 40, 10, 0, Math.PI * 2);
      ctx.fillStyle = "#F7CAA8";
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  } else if (expr === "thumbsup" || mode === "victory") {
    // Left resting arm + Right triumphant fist/thumbsup arm!
    ctx.save();
    ctx.translate(-44, 8); ctx.rotate(0.35);
    roundRectPath(ctx, -10, -6, 20, 40, 10); ctx.fillStyle = "#485E9B"; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 36, 10, 0, Math.PI * 2); ctx.fillStyle = "#F7CAA8"; ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.translate(46, 8);
    ctx.rotate(-2.3);
    roundRectPath(ctx, -11, -8, 22, 48, 11);
    ctx.fillStyle = "#485E9B";
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 44, 12, 0, Math.PI * 2);
    ctx.fillStyle = "#F7CAA8";
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else {
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * 44, 10);
      ctx.rotate(side * -0.22);
      roundRectPath(ctx, -10, -6, 20, 38, 10);
      ctx.fillStyle = "#485E9B"; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 34, 9.5, 0, Math.PI * 2);
      ctx.fillStyle = "#F7CAA8"; ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }

  // Head
  ctx.save();
  ctx.translate(0, -54);
  ctx.beginPath();
  ctx.ellipse(0, 0, 44, 46, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#F7CAA8";
  ctx.fill();
  ctx.stroke();

  // Bedhead hair
  ctx.beginPath();
  ctx.arc(0, -10, 45, Math.PI * 0.92, Math.PI * 2.08);
  ctx.lineTo(44, -22);
  ctx.lineTo(22, -46);
  ctx.lineTo(6, -34);
  ctx.lineTo(-10, -58);
  ctx.lineTo(-26, -38);
  ctx.lineTo(-44, -22);
  ctx.closePath();
  ctx.fillStyle = "#31243D";
  ctx.fill();
  ctx.stroke();

  // Red Ninja Headband (Stage 4!)
  if (ninjaBand) {
    roundRectPath(ctx, -45, -24, 90, 14, 5);
    ctx.fillStyle = "#FF3E6C";
    ctx.fill();
    ctx.stroke();
    // Fluttering headband tails
    ctx.beginPath();
    ctx.moveTo(42, -18);
    ctx.quadraticCurveTo(64, -24 + Math.sin(stepPhase * 2) * 8, 76, -8 + Math.cos(stepPhase * 2) * 8);
    ctx.lineTo(68, 2);
    ctx.quadraticCurveTo(56, -12, 42, -12);
    ctx.closePath();
    ctx.fillStyle = "#FF3E6C";
    ctx.fill();
    ctx.stroke();
  }

  if (bump) {
    ctx.beginPath();
    ctx.arc(20, -44, 14, 0, Math.PI * 2);
    ctx.fillStyle = "#FF5C77";
    ctx.fill();
    ctx.stroke();
  }

  // Eyes
  for (const side of [-1, 1]) {
    const ex = side * 16;
    if (expr === "sleep") {
      ctx.beginPath();
      ctx.arc(ex, 0, 8, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    } else if (expr === "happy" || expr === "thumbsup") {
      ctx.beginPath();
      ctx.arc(ex, 4, 8, 1.1 * Math.PI, 1.9 * Math.PI);
      ctx.stroke();
    } else if (expr === "shock") {
      ctx.beginPath();
      ctx.arc(ex, 0, 10, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ex, 0, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = INK;
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(ex, 0, 4.8, 0, Math.PI * 2);
      ctx.fillStyle = INK;
      ctx.fill();
      // Relatable tired parenting dark circles!
      ctx.beginPath();
      ctx.arc(ex, 5, 8, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = "rgba(85, 55, 105, 0.55)";
      ctx.stroke();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 4.2;
    }
  }

  // Mouth
  if (expr === "sleep") {
    ctx.beginPath();
    ctx.ellipse(0, 20, 9, 11, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#C94B6A";
    ctx.fill();
    ctx.stroke();
    // Comic sleep bubble!
    ctx.beginPath();
    ctx.arc(14, 12, 13, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(180, 235, 255, 0.72)";
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.stroke();
  } else if (expr === "shock") {
    ctx.beginPath();
    ctx.ellipse(0, 20, 13, 12, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#C94B6A";
    ctx.fill();
    ctx.stroke();
  } else if (expr === "happy" || expr === "thumbsup") {
    ctx.beginPath();
    ctx.arc(0, 14, 14, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.closePath();
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.stroke();
  } else if (expr === "crane") {
    ctx.beginPath();
    ctx.moveTo(-10, 20); ctx.bezierCurveTo(-4, 16, 4, 24, 10, 20);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(-10, 20); ctx.quadraticCurveTo(0, 25, 10, 18);
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}

// =========================================================================
// STUDIO PHOTOGRAPHER RIG (Stage 3: Peek-a-Boo Studio)
// =========================================================================
function drawPhotographer(ctx, opts = {}) {
  const { x = 280, y = 450, scale = 1, fanOpen = 0, bounce = 0, side = 0, expr = "cheer" } = opts;
  ctx.save();
  ctx.translate(x, y + bounce);
  ctx.scale(scale, scale);
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.lineJoin = "round";

  // Grounded cute studio shoes + gesturing left arm
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 18, 92, 16, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#5B3B5E"; ctx.fill(); ctx.stroke();
  }
  ctx.save();
  ctx.translate(-38, 22); ctx.rotate(0.55 - fanOpen * 0.4);
  roundRectPath(ctx, -10, -6, 20, 38, 10);
  ctx.fillStyle = "#FF8E3C"; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 34, 9.5, 0, Math.PI * 2);
  ctx.fillStyle = "#FFE0C4"; ctx.fill(); ctx.stroke();
  ctx.restore();

  // Colorful striped studio vest body
  roundRectPath(ctx, -40, 0, 80, 88, 24);
  ctx.fillStyle = "#FF8E3C";
  ctx.fill();
  ctx.stroke();
  // Bowtie
  ctx.beginPath();
  ctx.moveTo(-16, 6); ctx.lineTo(16, 20); ctx.lineTo(16, 6); ctx.lineTo(-16, 20); ctx.closePath();
  ctx.fillStyle = "#FF3E6C";
  ctx.fill();
  ctx.stroke();

  // Head
  ctx.save();
  ctx.translate(0, -44);
  // Goofy plush bunny-ear headband!
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(s * 18, -34);
    ctx.rotate(s * (0.22 + Math.sin(bounce * 0.25) * 0.12));
    ctx.beginPath();
    ctx.ellipse(0, -24, 12, 28, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#FFF5FA";
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -22, 6, 18, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#FFA6C1";
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(0, 0, 42, 0, Math.PI * 2);
  ctx.fillStyle = "#FFE0C4";
  ctx.fill();
  ctx.stroke();
  // Hair bangs
  ctx.beginPath();
  ctx.arc(0, -8, 42, Math.PI * 1.05, Math.PI * 1.95);
  ctx.fillStyle = "#5B3B5E";
  ctx.fill();
  ctx.stroke();
  // Cheerful glasses & eyes
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * 15, 2, 11, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(s * 15 + side * 3, 2, 4, 0, Math.PI * 2);
    ctx.fillStyle = INK;
    ctx.fill();
  }
  // Big grin
  ctx.beginPath();
  ctx.arc(0, 14, 14, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.closePath();
  ctx.fillStyle = expr === "boo" ? "#FF4D79" : "#FFFFFF";
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Giant pastel Peek-a-Boo Fan (covers face when fanOpen > 0.5!)
  ctx.save();
  const fY = lerp(56, -42, fanOpen);
  const fScale = lerp(0.55, 1.15, fanOpen);
  ctx.translate(48 * (1 - fanOpen), fY);
  ctx.scale(fScale, fScale);
  ctx.beginPath();
  ctx.moveTo(0, 26);
  ctx.arc(0, 26, 62, Math.PI * 1.12, Math.PI * 1.88);
  ctx.closePath();
  ctx.fillStyle = "#FFE156";
  ctx.fill();
  ctx.stroke();
  // Fan ribs
  ctx.lineWidth = 2.4;
  for (let a = 1.25; a <= 1.75; a += 0.16) {
    ctx.beginPath();
    ctx.moveTo(0, 26);
    ctx.lineTo(Math.cos(Math.PI * a) * 58, 26 + Math.sin(Math.PI * a) * 58);
    ctx.stroke();
  }
  drawStrokedText(ctx, "까꿍", 0, -4, 22, "#FF3E6C", "#FFFFFF", 5);
  ctx.restore();
  ctx.restore();
}

// =========================================================================
// PERCHED MENU MASCOT ("쪽쪽 요정" — Rhythm Heaven 2.5D Info Card Overhang!)
// =========================================================================
function drawMascot(ctx, x, y, beatPhase, mood = "happy") {
  const b = Math.sin(beatPhase * Math.PI * 2);
  const hop = Math.abs(Math.sin(beatPhase * Math.PI)) * 6;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = 3.8;
  ctx.strokeStyle = INK;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // Dangling swinging legs OVER the card top edge!
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * 16, 12);
    ctx.rotate(b * 0.36 * side);
    roundRectPath(ctx, -8, 0, 16, 26, 8);
    ctx.fillStyle = "#FFF0DF";
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 24, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#FF7396";
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Tiny fluttering fairy wings
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * 26, -16 - hop * 0.5);
    ctx.rotate(side * (0.25 + b * 0.25));
    ctx.beginPath();
    ctx.ellipse(side * 12, 0, 18, 11, side * -0.3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Round seated plush body
  ctx.save();
  ctx.translate(0, -hop * 0.6);
  ctx.beginPath();
  ctx.ellipse(0, -6, 30, 26, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#8AF0D1";
  ctx.fill();
  ctx.stroke();

  // Golden star belly charm
  drawStarPath(ctx, 0, -4, 5, 10, 4.5);
  ctx.fillStyle = "#FFE156";
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.lineWidth = 3.8;

  // Expressive head bobbing to Menu BPM!
  ctx.save();
  ctx.translate(0, -42);
  ctx.rotate(b * 0.14);

  // Bouncy musical-note antenna
  ctx.beginPath();
  ctx.moveTo(0, -32);
  ctx.quadraticCurveTo(b * 12, -52, 8 + b * 10, -56);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(10 + b * 10, -56, 8, 0, Math.PI * 2);
  ctx.fillStyle = "#FFE156";
  ctx.fill();
  ctx.stroke();

  // Head oval
  ctx.beginPath();
  ctx.ellipse(0, 0, 38, 33, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#FFE6D0";
  ctx.fill();
  ctx.stroke();

  // Mint hood trim
  ctx.beginPath();
  ctx.arc(0, -4, 39, Math.PI * 0.95, Math.PI * 2.05);
  ctx.fillStyle = "#8AF0D1";
  ctx.fill();
  ctx.stroke();

  // Cheeks
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 22, 8, 7, 4.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 105, 145, 0.55)";
    ctx.fill();
  }

  // Mood-reactive face!
  if (mood === "remix") {
    // Cool star-shaped shades for Remix tile!
    for (const s of [-1, 1]) {
      drawStarPath(ctx, s * 14, -2, 5, 12, 6);
      ctx.fillStyle = "#FF3E6C";
      ctx.fill();
      ctx.lineWidth = 2.6;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 12, 10, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  } else if (mood === "locked") {
    // Puzzled eyes + floating "?"
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(s * 13, -2, 5, 0, Math.PI * 2);
      ctx.fillStyle = INK;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(0, 12, 6, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
    drawStrokedText(ctx, "?", 44, -28, 30, "#FFE156", INK, 6);
  } else if (mood === "celebrate") {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(s * 13, 0, 7, 1.1 * Math.PI, 1.9 * Math.PI);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 10, 11, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.closePath();
    ctx.fillStyle = "#FF5C8A";
    ctx.fill();
    ctx.stroke();
  } else {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(s * 13, -2, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = INK;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s * 13 - 2, -4, 2, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
    }
    // Cute mini pacifier in mouth
    drawPacifier(ctx, 0, 12, 0.56, Math.PI, false);
  }
  ctx.restore(); // head
  ctx.restore(); // body
  ctx.restore();
}

// =========================================================================
// 15 BESPOKE 1-CUT EPILOGUE COMIC ILLUSTRATIONS (5 Stages x 3 Ranks)
// =========================================================================
function drawEpilogueComic(ctx, x, y, w, h, stageId, rank, animT) {
  ctx.save();
  // Polaroid / Comic Frame card with slight playful tilt
  ctx.translate(x + w * 0.5, y + h * 0.5);
  ctx.rotate(-0.025);
  ctx.translate(-w * 0.5, -h * 0.5);

  // Drop shadow
  ctx.fillStyle = "rgba(15, 8, 28, 0.45)";
  roundRectPath(ctx, 10, 14, w, h, 20);
  ctx.fill();

  // White card border
  roundRectPath(ctx, 0, 0, w, h, 20);
  ctx.fillStyle = "#FFFDF7";
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = INK;
  ctx.stroke();

  // Inner comic panel viewport
  const pad = 16;
  const iw = w - pad * 2;
  const ih = h - pad * 2 - 48;
  ctx.save();
  roundRectPath(ctx, pad, pad, iw, ih, 12);
  ctx.clip();

  // Panel background gradient by rank
  const bgGrad = ctx.createLinearGradient(0, pad, 0, pad + ih);
  if (rank === "superb") {
    bgGrad.addColorStop(0, "#FFE270");
    bgGrad.addColorStop(1, "#FF9A8B");
  } else if (rank === "ok") {
    bgGrad.addColorStop(0, "#8DE4FF");
    bgGrad.addColorStop(1, "#C5F5C2");
  } else {
    bgGrad.addColorStop(0, "#5B557A");
    bgGrad.addColorStop(1, "#352F4F");
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(pad, pad, iw, ih);

  // Subtle rotating sunburst rays for Superb!
  const cx = pad + iw * 0.5;
  const cy = pad + ih * 0.55;
  if (rank === "superb") {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(animT * 0.35);
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-22, -320);
      ctx.lineTo(22, -320);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  const bob = Math.sin(animT * 5) * 6;

  // Stage x Rank custom gag scenes!
  if (stageId === "pacifier") {
    if (rank === "superb") {
      // Baby crowned Pacifier King on crescent moon + Dad cheering!
      ctx.fillStyle = "#FFF3A1";
      ctx.beginPath(); ctx.arc(cx - 50, cy - 10, 72, 0.2 * Math.PI, 1.5 * Math.PI); ctx.fill();
      drawBaby(ctx, { x: cx - 46, y: cy + 8 + bob, scale: 0.72, expr: "sparkle", crown: true, hasPacifier: true, pacifierGolden: true, shadow: false });
      drawDad(ctx, { x: cx + 82, y: cy + 44 - bob * 0.5, scale: 0.72, mode: "victory", expr: "thumbsup" });
    } else if (rank === "ok") {
      drawBaby(ctx, { x: cx - 32, y: cy + 16, scale: 0.76, expr: "bliss", hasPacifier: true, shadow: false });
      drawDad(ctx, { x: cx + 76, y: cy + 38 + bob * 0.4, scale: 0.7, mode: "front", expr: "happy" });
    } else {
      // Dad plastered with pacifiers while Baby laughs!
      drawDad(ctx, { x: cx - 55, y: cy + 42, scale: 0.75, mode: "front", expr: "shock", bump: true });
      drawPacifier(ctx, cx - 72, cy - 6, 0.58, 0.3);
      drawPacifier(ctx, cx - 35, cy - 14, 0.58, -0.5);
      drawPacifier(ctx, cx - 55, cy + 16, 0.62, 0.1);
      drawBaby(ctx, { x: cx + 76, y: cy + 28 + bob, scale: 0.7, expr: "giggle", shadow: false });
    }
  } else if (stageId === "burp") {
    if (rank === "superb") {
      // Baby conducting golden musical bubbles!
      for (let i = 0; i < 6; i++) {
        const bx = pad + 40 + i * 62;
        const by = pad + 55 + Math.sin(animT * 3 + i) * 18;
        ctx.beginPath(); ctx.arc(bx, by, 18, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fill();
        ctx.lineWidth = 2.5; ctx.strokeStyle = "#FFFFFF"; ctx.stroke();
        drawStrokedText(ctx, "♪", bx, by, 18, "#FF3E6C", "#FFFFFF", 3);
      }
      drawBaby(ctx, { x: cx, y: cy + 26 + bob, scale: 0.85, expr: "bliss", crown: true, onesie: "#FF9F1C", shadow: false });
    } else if (rank === "ok") {
      drawDad(ctx, { x: cx - 38, y: cy + 40, scale: 0.75, mode: "front", expr: "happy" });
      drawBaby(ctx, { x: cx + 48, y: cy + 22 + bob * 0.5, scale: 0.72, expr: "sleepy", onesie: "#FFE156", shadow: false });
    } else {
      // 3AM wide-awake shock!
      drawStrokedText(ctx, "AM 03:47", cx, pad + 32, 28, "#FF6B8B", INK, 5);
      drawDad(ctx, { x: cx - 54, y: cy + 44, scale: 0.74, mode: "front", expr: "shock" });
      drawBaby(ctx, { x: cx + 62, y: cy + 22 + Math.abs(bob) * 2, scale: 0.74, expr: "shock", armL: -1.1, armR: -1.1, shadow: false });
    }
  } else if (stageId === "photo") {
    if (rank === "superb") {
      // Glamorous 100-day studio portrait!
      drawStrokedText(ctx, "★ 100 DAYS ★", cx, pad + 32, 26, "#FF3E6C", "#FFFFFF", 6);
      drawBaby(ctx, { x: cx, y: cy + 24 + bob * 0.6, scale: 0.88, expr: "sparkle", handsOnCheeks: true, crown: true, onesie: "#FF8FA3", shadow: false });
    } else if (rank === "ok") {
      drawPhotographer(ctx, { x: cx - 88, y: cy + 34, scale: 0.65, fanOpen: 0.1, bounce: bob * 0.5 });
      drawBaby(ctx, { x: cx + 44, y: cy + 26, scale: 0.78, expr: "happy", onesie: "#FF8FA3", shadow: false });
    } else {
      // Dad snoring with bubble while Baby gives side-eye!
      drawDad(ctx, { x: cx - 58, y: cy + 44, scale: 0.76, mode: "front", expr: "sleep" });
      drawBaby(ctx, { x: cx + 66, y: cy + 24, scale: 0.74, expr: "mischievous", onesie: "#FF8FA3", shadow: false });
    }
  } else if (stageId === "ninja") {
    if (rank === "superb") {
      // Dad reached freedom! Glowing golden controller & chicken icon!
      drawStrokedText(ctx, "자유시간!!", cx + 65, pad + 44, 28, "#FFE156", INK, 6);
      drawDad(ctx, { x: cx - 32, y: cy + 36 - Math.abs(bob), scale: 0.78, mode: "victory", expr: "thumbsup", ninjaBand: true });
      drawBaby(ctx, { x: cx + 82, y: cy + 44, scale: 0.55, expr: "sleepy", shadow: false });
    } else if (rank === "ok") {
      drawDad(ctx, { x: cx, y: cy + 38, scale: 0.78, mode: "ninja", expr: "happy", ninjaBand: true, stepPhase: animT * 4 });
    } else {
      // Rubber duck betrayal!
      drawRubberDuck(ctx, cx, cy + 56, 1.35, Math.abs(Math.sin(animT * 8)) * 0.4);
      drawDad(ctx, { x: cx - 64, y: cy + 38, scale: 0.72, mode: "ninja", expr: "shock", ninjaBand: true });
      drawBaby(ctx, { x: cx + 78, y: cy + 16, scale: 0.68, expr: "shock", shadow: false });
    }
  } else {
    // GRAND REMIX! Whole cast curtain call!
    if (rank === "superb") {
      drawPhotographer(ctx, { x: cx - 108, y: cy + 36 + bob * 0.5, scale: 0.58, fanOpen: 0.2 });
      drawDad(ctx, { x: cx + 98, y: cy + 38 - bob * 0.5, scale: 0.68, mode: "victory", expr: "thumbsup", ninjaBand: true });
      drawBaby(ctx, { x: cx, y: cy + 22 + bob, scale: 0.84, expr: "sparkle", crown: true, handsOnCheeks: true, onesie: "#FFE156", shadow: false });
    } else if (rank === "ok") {
      drawDad(ctx, { x: cx - 44, y: cy + 40, scale: 0.72, mode: "victory", expr: "happy" });
      drawBaby(ctx, { x: cx + 52, y: cy + 24 + bob * 0.5, scale: 0.74, expr: "bliss", hasPacifier: true, shadow: false });
    } else {
      drawDad(ctx, { x: cx - 58, y: cy + 42, scale: 0.72, mode: "front", expr: "shock", bump: true });
      drawBaby(ctx, { x: cx + 56, y: cy + 24 + bob, scale: 0.72, expr: "giggle", shadow: false });
      drawPacifier(ctx, cx, cy - 30, 0.7, animT * 4);
      drawRubberDuck(ctx, cx + 6, cy + 54, 0.9, 0.2);
    }
  }

  ctx.restore(); // end clip

  // Inner frame stroke
  roundRectPath(ctx, pad, pad, iw, ih, 12);
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();

  // Epilogue Comic Caption Strip at bottom of Polaroid
  const captions = {
    pacifier: {
      superb: "전설의 0.1초 쪽쪽이 명사수 등극!",
      ok: "아슬아슬했지만 오늘도 평화로운 요람.",
      tryagain: "아빠 얼굴이 쪽쪽이 꽂이가 되었다...",
    },
    burp: {
      superb: "카네기 홀을 울린 황금빛 꺼억 교향곡!",
      ok: "따뜻한 토닥임으로 기분 좋은 낮잠 완료.",
      tryagain: "새벽 3시 47분, 눈이 초롱초롱해졌다!",
    },
    photo: {
      superb: "할머니 카톡 프로필 10년 확정 인생샷!",
      ok: "살짝 흔들렸지만 미소만은 백점 만점!",
      tryagain: "주인공보다 아빠 코골이가 더 선명하다...",
    },
    ninja: {
      superb: "소리 없는 전설! 치킨과 게임의 낙원으로!",
      ok: "발끝에 쥐가 났지만 문 앞까지 무사 도착!",
      tryagain: "오리 인형 삐약 한 방에 육퇴 원점 복귀!",
    },
    remix: {
      superb: "위대한 육퇴 마스터! 온 우주가 박수친다!",
      ok: "정신없었지만 사랑스러운 우리 집 미라클!",
      tryagain: "쪽쪽이·트림·셔터·오리의 대혼돈 파티!",
    },
  };
  const cap = (captions[stageId] && captions[stageId][rank]) || "오늘도 리듬 타는 육아!";
  drawStrokedText(ctx, cap, w * 0.5, h - 30, 19, INK, "#FFFFFF", 0);

  ctx.restore();
}
