// Core math, spring physics, color utilities, and juicy motion-graphics particles

const W = 1280;
const H = 720;
const INK = "#26192C";
const FONT_MAIN = '"Jua", "Outfit", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
const FONT_NUM = '"Outfit", "Jua", sans-serif';

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function invLerp(a, b, v) {
  return a === b ? 0 : (v - a) / (b - a);
}
function smoothstep(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}
function rand(lo, hi) {
  return lo + Math.random() * (hi - lo);
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const Ease = {
  outQuad: (t) => 1 - (1 - clamp(t, 0, 1)) ** 2,
  inQuad: (t) => clamp(t, 0, 1) ** 2,
  outCubic: (t) => 1 - (1 - clamp(t, 0, 1)) ** 3,
  inOutCubic: (t) => {
    const x = clamp(t, 0, 1);
    return x < 0.5 ? 4 * x * x * x : 1 - ((-2 * x + 2) ** 3) / 2;
  },
  outExpo: (t) => {
    const x = clamp(t, 0, 1);
    return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
  },
  outBack: (t, s = 1.70158) => {
    const x = clamp(t, 0, 1) - 1;
    return 1 + (s + 1) * x * x * x + s * x * x;
  },
  outElastic: (t) => {
    const x = clamp(t, 0, 1);
    if (x === 0 || x === 1) return x;
    return Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
  outBounce: (t) => {
    let x = clamp(t, 0, 1);
    const n1 = 7.5625, d1 = 2.75;
    if (x < 1 / d1) return n1 * x * x;
    if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
    if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
    return n1 * (x -= 2.625 / d1) * x + 0.984375;
  },
};

function hexToRgb(hex) {
  if (Array.isArray(hex)) return hex;
  if (typeof hex === "string" && hex.startsWith("rgb")) {
    const m = hex.match(/\d+/g);
    if (m && m.length >= 3) return [Number(m[0]), Number(m[1]), Number(m[2])];
  }
  const h = String(hex).replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lerpHex(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const k = clamp(t, 0, 1);
  const r = Math.round(lerp(a[0], b[0], k));
  const g = Math.round(lerp(a[1], b[1], k));
  const bl = Math.round(lerp(a[2], b[2], k));
  return `rgb(${r},${g},${bl})`;
}

// Real damped harmonic spring for organic squash/stretch & UI overshoot
class Spring {
  constructor(val = 0, stiffness = 260, damping = 18) {
    this.val = val;
    this.target = val;
    this.vel = 0;
    this.stiffness = stiffness;
    this.damping = damping;
  }
  set(v) {
    this.val = v;
    this.target = v;
    this.vel = 0;
  }
  kick(impulse) {
    this.vel += impulse;
  }
  update(dt) {
    const step = Math.min(dt, 0.05);
    const force = (this.target - this.val) * this.stiffness;
    const damp = -this.vel * this.damping;
    this.vel += (force + damp) * step;
    this.val += this.vel * step;
    return this.val;
  }
}

// Motion-graphics particle & comic pop-text system
class ParticleSystem {
  constructor() {
    this.items = [];
  }
  clear() {
    this.items.length = 0;
  }
  burstStars(x, y, count = 14, colors = ["#FFE156", "#FF8FA3", "#7CE8FF", "#FFFFFF"], speed = 280) {
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + rand(-0.22, 0.22);
      const sp = rand(speed * 0.45, speed * 1.15);
      this.items.push({
        kind: "star",
        x, y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - rand(20, 90),
        rot: rand(0, Math.PI * 2),
        vrot: rand(-8, 8),
        size: rand(9, 20),
        color: colors[i % colors.length],
        life: 0,
        maxLife: rand(0.45, 0.85),
        gravity: 340,
      });
    }
  }
  burstNotes(x, y, count = 6, color = "#FFE156") {
    const glyphs = ["♪", "♫", "★", "✦"];
    for (let i = 0; i < count; i++) {
      this.items.push({
        kind: "glyph",
        glyph: glyphs[i % glyphs.length],
        x: x + rand(-24, 24),
        y: y + rand(-18, 12),
        vx: rand(-110, 110),
        vy: rand(-210, -90),
        rot: rand(-0.4, 0.4),
        vrot: rand(-2.2, 2.2),
        size: rand(24, 38),
        color,
        life: 0,
        maxLife: rand(0.65, 1.05),
        gravity: 90,
      });
    }
  }
  spawnRing(x, y, color = "#FFE156", maxR = 130, lineWidth = 10, maxLife = 0.42) {
    this.items.push({
      kind: "ring",
      x, y,
      color,
      r0: 14,
      r1: maxR,
      lw: lineWidth,
      life: 0,
      maxLife,
    });
  }
  spawnBubble(x, y, r = 24, vx = 0, vy = -120) {
    this.items.push({
      kind: "bubble",
      x, y, vx, vy, r,
      wobble: rand(0, Math.PI * 2),
      life: 0,
      maxLife: rand(0.9, 1.5),
    });
  }
  spawnComicText(x, y, text, color = "#FFE156", size = 46, maxLife = 0.62) {
    this.items.push({
      kind: "comic",
      x, y,
      vy: -65,
      text,
      color,
      size,
      rot: rand(-0.16, 0.16),
      life: 0,
      maxLife,
    });
  }
  spawnConfetti(x, y, count = 36, spread = 460) {
    const palette = ["#FF6B8B", "#FFD93D", "#6BCB77", "#4D96FF", "#C77DFF", "#FF9F1C", "#FFFFFF"];
    for (let i = 0; i < count; i++) {
      const ang = rand(-Math.PI * 0.95, -Math.PI * 0.05);
      const sp = rand(spread * 0.35, spread);
      this.items.push({
        kind: "confetti",
        x: x + rand(-80, 80),
        y: y + rand(-30, 30),
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - rand(40, 160),
        w: rand(10, 18),
        h: rand(6, 11),
        rot: rand(0, Math.PI * 2),
        vrot: rand(-10, 10),
        color: palette[i % palette.length],
        life: 0,
        maxLife: rand(1.1, 2.0),
        gravity: 420,
      });
    }
  }
  spawnSweat(x, y) {
    for (let i = 0; i < 3; i++) {
      this.items.push({
        kind: "sweat",
        x: x + rand(-18, 18),
        y: y + rand(-10, 10),
        vx: (i - 1) * 95 + rand(-20, 20),
        vy: -130 - rand(0, 60),
        size: rand(10, 15),
        life: 0,
        maxLife: 0.55,
        gravity: 480,
      });
    }
  }
  update(dt) {
    const step = Math.min(dt, 0.05);
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.life += step;
      if (p.life >= p.maxLife) {
        this.items.splice(i, 1);
        continue;
      }
      if (p.vx !== undefined) p.x += p.vx * step;
      if (p.vy !== undefined) p.y += p.vy * step;
      if (p.gravity) p.vy += p.gravity * step;
      if (p.vrot) p.rot += p.vrot * step;
      if (p.kind === "bubble") {
        p.wobble += step * 7;
        p.x += Math.sin(p.wobble) * 32 * step;
      }
      if (p.kind === "confetti") {
        p.vx *= 0.985;
      }
    }
  }
  draw(ctx) {
    for (const p of this.items) {
      const t = p.life / p.maxLife;
      const alpha = t < 0.72 ? 1 : 1 - (t - 0.72) / 0.28;
      ctx.save();
      ctx.globalAlpha = clamp(alpha, 0, 1);
      if (p.kind === "star") {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        const s = p.size * (1 - t * 0.45);
        drawStarPath(ctx, 0, 0, 5, s, s * 0.45);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = INK;
        ctx.stroke();
      } else if (p.kind === "glyph") {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        const sc = t < 0.18 ? Ease.outBack(t / 0.18) : 1 - t * 0.18;
        ctx.scale(sc, sc);
        ctx.font = `900 ${p.size}px ${FONT_MAIN}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 5;
        ctx.strokeStyle = INK;
        ctx.strokeText(p.glyph, 0, 0);
        ctx.fillStyle = p.color;
        ctx.fillText(p.glyph, 0, 0);
      } else if (p.kind === "ring") {
        const r = lerp(p.r0, p.r1, Ease.outCubic(t));
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1.5, p.lw * (1 - t));
        ctx.stroke();
      } else if (p.kind === "bubble") {
        const sc = t < 0.15 ? Ease.outBack(t / 0.15) : 1 + Math.sin(p.wobble) * 0.05;
        ctx.translate(p.x, p.y);
        ctx.scale(sc, sc);
        const g = ctx.createRadialGradient(-p.r * 0.3, -p.r * 0.3, 2, 0, 0, p.r);
        g.addColorStop(0, "rgba(255,255,255,0.85)");
        g.addColorStop(0.5, "rgba(180,240,255,0.38)");
        g.addColorStop(0.85, "rgba(255,180,235,0.45)");
        g.addColorStop(1, "rgba(255,255,255,0.75)");
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(-p.r * 0.32, -p.r * 0.32, p.r * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.fill();
      } else if (p.kind === "comic") {
        const sc = t < 0.2 ? Ease.outBack(t / 0.2, 2.4) : 1;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(sc, sc);
        ctx.font = `900 ${p.size}px ${FONT_MAIN}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineJoin = "round";
        ctx.lineWidth = 9;
        ctx.strokeStyle = INK;
        ctx.strokeText(p.text, 0, 0);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, 0, 0);
      } else if (p.kind === "confetti") {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.life * 11));
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w * 0.5, -p.h * 0.5, p.w, p.h);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = INK;
        ctx.strokeRect(-p.w * 0.5, -p.h * 0.5, p.w, p.h);
      } else if (p.kind === "sweat") {
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.vy, p.vx) + Math.PI * 0.5);
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.quadraticCurveTo(p.size * 0.75, 0, 0, p.size * 0.8);
        ctx.quadraticCurveTo(-p.size * 0.75, 0, 0, -p.size);
        ctx.fillStyle = "#7CE8FF";
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = INK;
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

function drawStarPath(ctx, cx, cy, spikes, outerR, innerR) {
  let rot = -Math.PI / 2;
  const step = Math.PI / spikes;
  ctx.beginPath();
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
    rot += step;
  }
  ctx.closePath();
}
