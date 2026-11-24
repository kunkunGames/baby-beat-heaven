// Virtual 2D Cinema Camera Rig — beat-synced zoom, dolly, whip-pan, Dutch tilt,
// blackout spotlight, volumetric god-rays, iris wipe, flash, and vignette.

class CameraRig {
  constructor() {
    this.x = new Spring(0, 150, 18);
    this.y = new Spring(0, 150, 18);
    this.zoom = new Spring(1, 210, 19);
    this.angle = new Spring(0, 220, 16);
    this.trauma = 0;
    this.flashAlpha = 0;
    this.flashColor = "#FFFFFF";
    this.vignette = 0;
    this.vignetteTarget = 0.14;
    this.vignetteColor = "rgba(18, 10, 32,";
    this.blackout = 0;
    this.blackoutTarget = 0;
    this.desat = 0;
    this.iris = 1.6; // >1.4 = fully open, 0 = fully closed
    this.irisTarget = 1.6;
    this.irisCx = W * 0.5;
    this.irisCy = H * 0.5;
    this.godRays = 0;
    this.godRaysTarget = 0;
    this.godRaysRainbow = false;
    this.cinemaBars = 0;
    this.cinemaBarsTarget = 0;
    this.swayAmp = 0;
    this.swayPhase = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.time = 0;
  }

  reset() {
    this.x.set(0);
    this.y.set(0);
    this.zoom.set(1);
    this.angle.set(0);
    this.trauma = 0;
    this.flashAlpha = 0;
    this.vignette = 0.14;
    this.vignetteTarget = 0.14;
    this.vignetteColor = "rgba(18, 10, 32,";
    this.blackout = 0;
    this.blackoutTarget = 0;
    this.desat = 0;
    this.iris = 1.6;
    this.irisTarget = 1.6;
    this.irisCx = W * 0.5;
    this.irisCy = H * 0.5;
    this.godRays = 0;
    this.godRaysTarget = 0;
    this.godRaysRainbow = false;
    this.cinemaBars = 0;
    this.cinemaBarsTarget = 0;
    this.swayAmp = 0;
  }

  panTo(tx, ty, zoom = 1, angle = 0) {
    this.x.target = tx;
    this.y.target = ty;
    this.zoom.target = zoom;
    this.angle.target = angle;
  }

  snapTo(tx, ty, zoom = 1, angle = 0) {
    this.x.set(tx);
    this.y.set(ty);
    this.zoom.set(zoom);
    this.angle.set(angle);
  }

  beatPulse(strength = 0.025) {
    this.zoom.kick(strength * 14);
  }

  hitPunch(strength = 0.06, roll = 0) {
    this.zoom.kick(strength * 20);
    if (roll) this.angle.kick(roll);
  }

  missKick() {
    this.trauma = Math.min(1, this.trauma + 0.52);
    this.angle.kick((Math.random() < 0.5 ? -1 : 1) * 0.85);
    this.zoom.kick(-1.0);
    this.desat = 0.85;
  }

  shake(amount = 0.45) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  flash(alpha = 0.85, color = "#FFFFFF") {
    this.flashAlpha = Math.max(this.flashAlpha, alpha);
    this.flashColor = color;
  }

  update(dt) {
    const step = Math.min(dt, 0.05);
    this.time += step;
    this.x.update(step);
    this.y.update(step);
    this.zoom.update(step);
    this.angle.update(step);
    this.trauma = Math.max(0, this.trauma - step * 2.4);
    const sh = this.trauma * this.trauma;
    this.shakeX = Math.sin(this.time * 67) * 20 * sh;
    this.shakeY = Math.cos(this.time * 83) * 16 * sh;
    this.flashAlpha = Math.max(0, this.flashAlpha - step * 2.9);
    this.desat = Math.max(0, this.desat - step * 2.3);
    this.vignette = lerp(this.vignette, this.vignetteTarget, 1 - Math.exp(-step * 6));
    this.blackout = lerp(this.blackout, this.blackoutTarget, 1 - Math.exp(-step * 12));
    this.iris = lerp(this.iris, this.irisTarget, 1 - Math.exp(-step * 5.5));
    this.godRays = lerp(this.godRays, this.godRaysTarget, 1 - Math.exp(-step * 4.5));
    this.cinemaBars = lerp(this.cinemaBars, this.cinemaBarsTarget, 1 - Math.exp(-step * 8));
  }

  applyWorld(ctx) {
    ctx.save();
    const sway = this.swayAmp ? Math.sin(this.swayPhase) * this.swayAmp : 0;
    const z = clamp(this.zoom.val, 0.55, 2.2);
    ctx.translate(W * 0.5 + this.shakeX, H * 0.5 + this.shakeY);
    ctx.rotate(this.angle.val + sway);
    ctx.scale(z, z);
    ctx.translate(-W * 0.5 - this.x.val, -H * 0.5 - this.y.val);
  }

  endWorld(ctx) {
    ctx.restore();
  }

  drawPostFX(ctx, blackoutCutouts = null) {
    // Brief desaturation overlay on misses
    if (this.desat > 0.02) {
      ctx.save();
      ctx.fillStyle = `rgba(38, 30, 56, ${this.desat * 0.28})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // Volumetric Climax God-Rays
    if (this.godRays > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const ox = W * 0.78;
      const oy = -80;
      const rays = 9;
      for (let i = 0; i < rays; i++) {
        const baseA = 0.52 + i * 0.22 + Math.sin(this.time * 0.9 + i) * 0.04;
        const spread = 0.085 + (i % 2) * 0.04;
        const len = 1450;
        const grad = ctx.createLinearGradient(ox, oy, ox - Math.cos(baseA) * len, oy + Math.sin(baseA) * len);
        if (this.godRaysRainbow) {
          const hue = (i * 42 + this.time * 55) % 360;
          grad.addColorStop(0, `hsla(${hue}, 95%, 74%, ${0.42 * this.godRays})`);
          grad.addColorStop(0.6, `hsla(${(hue + 35) % 360}, 95%, 68%, ${0.16 * this.godRays})`);
          grad.addColorStop(1, "rgba(255,255,255,0)");
        } else {
          grad.addColorStop(0, `rgba(255, 242, 178, ${0.46 * this.godRays})`);
          grad.addColorStop(0.55, `rgba(255, 224, 130, ${0.18 * this.godRays})`);
          grad.addColorStop(1, "rgba(255, 240, 200, 0)");
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(ox - Math.cos(baseA - spread) * len, oy + Math.sin(baseA - spread) * len);
        ctx.lineTo(ox - Math.cos(baseA + spread) * len, oy + Math.sin(baseA + spread) * len);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // Blackout blind-beat stealth darkness with optional glowing eyes
    if (this.blackout > 0.01) {
      ctx.save();
      ctx.fillStyle = `rgba(8, 6, 18, ${clamp(this.blackout * 0.96, 0, 0.96)})`;
      ctx.fillRect(0, 0, W, H);
      if (blackoutCutouts) blackoutCutouts(ctx, this.blackout);
      ctx.restore();
    }

    // Vignette
    if (this.vignette > 0.01) {
      ctx.save();
      const vg = ctx.createRadialGradient(W * 0.5, H * 0.5, H * 0.34, W * 0.5, H * 0.5, W * 0.68);
      vg.addColorStop(0, `${this.vignetteColor} 0)`);
      vg.addColorStop(1, `${this.vignetteColor} ${clamp(this.vignette, 0, 0.85)})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // Widescreen cinema bars for Skill Star / dramatic moments
    if (this.cinemaBars > 0.01) {
      const barH = 44 * this.cinemaBars;
      ctx.fillStyle = "#120B1F";
      ctx.fillRect(0, 0, W, barH);
      ctx.fillRect(0, H - barH, W, barH);
    }

    // Flash overlay
    if (this.flashAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = clamp(this.flashAlpha, 0, 1);
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // Cartoon circular iris wipe
    if (this.iris < 1.38) {
      const r = Math.max(0, this.iris * 820);
      ctx.save();
      ctx.fillStyle = "#140D24";
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.arc(this.irisCx, this.irisCy, r, 0, Math.PI * 2, true);
      ctx.fill("evenodd");
      ctx.restore();
    }
  }
}
