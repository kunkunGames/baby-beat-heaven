// Complete Game Engine: State Machine, Lookahead Scheduler, Judge Engine,
// Mascot Stage-Select Map, In-World Practice, 5-Step Epilogue, Calibration, LocalStorage & QA Bot

const SAVE_KEY = "baby_beat_heaven_v1";

function loadSave() {
  const def = {
    stages: {}, // id -> { rank: "superb"|"ok"|"tryagain", bestAcc: 0..100, skillStar: bool, medal: bool, perfect: bool, played: bool }
    rhythmIQ: 72,
    remixUnlocked: false,
    remixUnlockSeen: false,
    demoUnlockAll: false,
    offsetMs: 0,
    visualGuide: false,
    masterVol: 0.86,
    musicVol: 0.85,
    sfxVol: 0.95,
  };
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return def;
    const parsed = JSON.parse(raw);
    return { ...def, ...parsed, stages: { ...def.stages, ...(parsed.stages || {}) } };
  } catch {
    return def;
  }
}

function writeSave(save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {}
}

class BabyBeatHeavenApp {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.audio = new StudioAudio();
    this.cam = new CameraRig();
    this.particles = new ParticleSystem();
    this.vis = new StageVisualState();
    this.save = loadSave();

    this.audio.offsetMs = this.save.offsetMs || 0;
    this.audio.masterVol = this.save.masterVol ?? 0.86;
    this.audio.musicVol = this.save.musicVol ?? 0.85;
    this.audio.sfxVol = this.save.sfxVol ?? 0.95;

    // Query params for automated QA bot (?bot=perfect | ?bot=sloppy)
    const params = new URLSearchParams(window.location.search);
    this.botMode = params.get("bot") || null;

    // Core UI state
    this.state = "TITLE"; // TITLE | MENU | TITLE_CARD | PRACTICE | PLAY | RESULT | SETTINGS | CALIBRATE
    this.prevState = "MENU";
    this.time = 0;
    this.stateTime = 0;

    // Menu state
    this.selectedIdx = 0;
    this.menuBgTop = STAGES[0].themeTop;
    this.menuBgBot = STAGES[0].themeBot;
    this.cursorY = new Spring(0, 260, 20);
    this.unlockFlash = 0; // white light-wave sweep on Remix unlock!
    this.saveToast = 0;
    this.perfectChallengeMode = false;

    // Active stage run
    this.stage = STAGES[0];
    this.chart = null;
    this.songStartTime = 0;
    this.paused = false;
    this.pauseStartedAt = 0;
    this.lastEighthScheduled = -1;
    this.nextCueIdx = 0;
    this.activeSubStage = "pacifier";
    this.currentBeat = 0;
    this.lastWholeBeat = -1;
    this.schedulerTimer = null;
    this.holdingDown = false;
    this.activeHoldEv = null;
    this.combo = 0;
    this.maxCombo = 0;
    this.perfectCount = 0;
    this.goodCount = 0;
    this.missCount = 0;
    this.skillStarGot = false;
    this.perfectFailed = false;
    this.finishTriggered = false;
    this.lastDeltaMs = null;

    // Practice state
    this.practicePhase = "dialogue"; // dialogue | live | ready
    this.practiceLineIdx = 0;
    this.practiceSuccess = 0;
    this.practiceTargetSuccess = 3;
    this.practiceEvents = [];
    this.practiceCycleBeat = 0;
    this.practiceStartTime = 0;
    this.practiceLastCueBeat = -1;

    // Result 5-step epilogue state
    this.result = null;
    this.resultStampSpring = new Spring(0, 320, 15);
    this.resultStamped = false;
    this.resultTypedChars = 0;
    this.resultTypeAcc = 0;

    // Calibration state
    this.calStartTime = 0;
    this.calTaps = [];
    this.calLastTick = -1;

    // Hitboxes rebuilt every render for crisp mouse & touch buttons
    this.buttons = [];
    this.hoverBtnId = null;

    // Resize & input bindings
    this._bindEvents();
    this._resize();
    window.addEventListener("resize", () => this._resize());

    // Expose read-only inspection / QA test handle
    window.__BBH = this;

    // Main loop
    this.lastFrame = performance.now();
    requestAnimationFrame((ts) => this._loop(ts));
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(W * dpr);
    this.canvas.height = Math.round(H * dpr);
    this.dpr = dpr;
  }

  _canvasPoint(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    return { x, y };
  }

  _bindEvents() {
    this.canvas.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.audio.ensure();
      const pt = this._canvasPoint(e);
      this._onPointerDown(pt.x, pt.y);
    });
    window.addEventListener("pointerup", () => {
      this._onActionRelease();
    });
    this.canvas.addEventListener("pointermove", (e) => {
      const pt = this._canvasPoint(e);
      this.hoverBtnId = null;
      for (let i = this.buttons.length - 1; i >= 0; i--) {
        const b = this.buttons[i];
        if (pt.x >= b.x && pt.x <= b.x + b.w && pt.y >= b.y && pt.y <= b.y + b.h) {
          this.hoverBtnId = b.id;
          break;
        }
      }
      this.canvas.style.cursor = this.hoverBtnId ? "pointer" : "default";
    });

    window.addEventListener("keydown", (e) => {
      if (e.repeat) return;
      this.audio.ensure();
      const code = e.code;
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(code)) {
        e.preventDefault();
      }
      this._onKeyDown(code);
    });
    window.addEventListener("keyup", (e) => {
      const code = e.code;
      if (["Space", "KeyZ", "KeyJ", "Enter"].includes(code)) {
        this._onActionRelease();
      }
    });
  }

  _registerBtn(id, x, y, w, h, onClick) {
    this.buttons.push({ id, x, y, w, h, onClick });
    return this.hoverBtnId === id;
  }

  _hitButton(x, y) {
    for (let i = this.buttons.length - 1; i >= 0; i--) {
      const b = this.buttons[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        b.onClick();
        return true;
      }
    }
    return false;
  }

  // ===== GLOBAL INPUT ROUTING =====
  _onPointerDown(x, y) {
    if (this.state === "TITLE") {
      this.audio.playCue("ui_ok");
      this.goMenu();
      return;
    }
    if (this._hitButton(x, y)) return;

    if (this.state === "TITLE_CARD" && this.stateTime > 0.7) {
      this._finishTitleCard();
    } else if (this.state === "PRACTICE") {
      if (this.practicePhase === "dialogue") {
        this._advancePracticeDialogue();
      } else if (this.practicePhase === "live") {
        this._onActionPress();
      }
    } else if (this.state === "PLAY" && !this.paused) {
      this._onActionPress();
    } else if (this.state === "RESULT") {
      if (!this.resultStamped && this.stateTime > 0.6) {
        this._triggerResultStamp();
      }
    } else if (this.state === "CALIBRATE") {
      this._onCalibrateTap();
    }
  }

  _onKeyDown(code) {
    if (this.state === "TITLE") {
      if (["Space", "Enter", "KeyZ"].includes(code)) {
        this.audio.playCue("ui_ok");
        this.goMenu();
      }
      return;
    }
    if (this.state === "MENU") {
      if (code === "ArrowUp" || code === "KeyW") {
        this.selectedIdx = (this.selectedIdx + STAGES.length - 1) % STAGES.length;
        this.audio.playCue("ui_move");
      } else if (code === "ArrowDown" || code === "KeyS") {
        this.selectedIdx = (this.selectedIdx + 1) % STAGES.length;
        this.audio.playCue("ui_move");
      } else if (code === "Enter" || code === "Space" || code === "KeyZ") {
        this._tryLaunchSelected(true);
      } else if (code === "KeyX") {
        this._tryLaunchSelected(false);
      }
      return;
    }
    if (this.state === "TITLE_CARD") {
      if ((code === "KeyX" || code === "Escape") && this.stateTime > 0.5) {
        this._finishTitleCard();
      }
      return;
    }
    if (this.state === "PRACTICE") {
      if (code === "KeyX" || code === "Escape") {
        this.audio.playCue("ui_ok");
        this.startMainPlay();
      } else if (["Space", "KeyZ", "KeyJ", "Enter"].includes(code)) {
        if (this.practicePhase === "dialogue") this._advancePracticeDialogue();
        else if (this.practicePhase === "live") this._onActionPress();
      }
      return;
    }
    if (this.state === "PLAY") {
      if (code === "Escape") {
        this.togglePause();
        return;
      }
      if (!this.paused && ["Space", "KeyZ", "KeyJ", "Enter"].includes(code)) {
        this._onActionPress();
      }
      return;
    }
    if (this.state === "RESULT") {
      if (["Space", "Enter", "KeyZ"].includes(code)) {
        if (!this.resultStamped && this.stateTime > 0.6) this._triggerResultStamp();
        else if (this.resultStamped && this.stateTime > 3.6) this.goMenu();
      } else if (code === "KeyR" && this.resultStamped) {
        this.startStage(this.stage.id, false, this.perfectChallengeMode);
      }
      return;
    }
    if (this.state === "CALIBRATE") {
      if (code === "Escape") this.openSettings();
      else if (["Space", "KeyZ", "Enter"].includes(code)) this._onCalibrateTap();
      return;
    }
    if (this.state === "SETTINGS") {
      if (code === "Escape") this.goMenu();
    }
  }

  // ===== SCENE TRANSITIONS =====
  isStageUnlocked(st) {
    if (!st.isRemix) return true;
    return this.save.remixUnlocked || this.save.demoUnlockAll;
  }

  countClearedCoreStages() {
    let c = 0;
    for (const st of STAGES) {
      if (st.isRemix) continue;
      const rec = this.save.stages[st.id];
      if (rec && (rec.rank === "superb" || rec.rank === "ok")) c++;
    }
    return c;
  }

  goMenu() {
    this._stopStageScheduler();
    this.paused = false;
    this.state = "MENU";
    this.stateTime = 0;
    this.cam.reset();
    this.particles.clear();
    this.audio.startLoop("menu", 118);

    // Check Remix unlock trigger (clearing any 2 core stages!)
    if (!this.save.remixUnlocked && this.countClearedCoreStages() >= 2) {
      this.save.remixUnlocked = true;
      writeSave(this.save);
    }
    if (this.save.remixUnlocked && !this.save.remixUnlockSeen) {
      this.save.remixUnlockSeen = true;
      writeSave(this.save);
      this.selectedIdx = 4; // focus Remix!
      this.unlockFlash = 1.0;
      this.audio.playCue("unlock_burst");
      this.particles.spawnConfetti(W * 0.5, H * 0.45, 55, 520);
    }
  }

  openSettings() {
    this._stopStageScheduler();
    this.particles.clear();
    this.prevState = this.state === "CALIBRATE" ? "MENU" : this.state;
    this.state = "SETTINGS";
    this.stateTime = 0;
    this.audio.playCue("ui_ok");
  }

  startCalibration() {
    this.audio.stopLoop();
    this.state = "CALIBRATE";
    this.stateTime = 0;
    this.calTaps = [];
    this.calLastTick = -1;
    this.calStartTime = this.audio.now() + 0.5;
    this.audio.playCue("ui_ok");
  }

  _tryLaunchSelected(withPractice) {
    const st = STAGES[this.selectedIdx];
    if (!this.isStageUnlocked(st)) {
      this.audio.playCue("miss_bonk");
      this.cam.shake(0.25);
      return;
    }
    this.audio.playCue("ui_ok");
    this.startStage(st.id, withPractice, false);
  }

  startStage(stageId, withPractice = true, perfectMode = false) {
    this._stopStageScheduler();
    this.stage = getStageById(stageId);
    this.wantPractice = withPractice && !this.botMode;
    this.perfectChallengeMode = perfectMode;
    this.state = "TITLE_CARD";
    this.stateTime = 0;
    this.cam.reset();
    this.particles.clear();
    this.vis.reset();
    this.audio.playTitleCardJingle(this.stage.id);
  }

  _finishTitleCard() {
    if (this.wantPractice) this.startPractice();
    else this.startMainPlay();
  }

  // ===== IN-WORLD CONVERSATIONAL PRACTICE =====
  startPractice() {
    this.state = "PRACTICE";
    this.stateTime = 0;
    this.practicePhase = "dialogue";
    this.practiceLineIdx = 0;
    this.practiceSuccess = 0;
    this.vis.reset();
    this.cam.reset();
    this.particles.clear();
    this.activeSubStage = this.stage.isRemix ? "pacifier" : this.stage.id;
    this.audio.startLoop("practice", this.stage.bpm, this.activeSubStage);
  }

  _advancePracticeDialogue() {
    this.audio.playCue("ui_ok");
    this.practiceLineIdx++;
    if (this.practiceLineIdx >= this.stage.practiceLines.length) {
      if (this.stage.isRemix) {
        // Remix skips tedious practice and jumps right into the show!
        this.startMainPlay();
        return;
      }
      this.practicePhase = "live";
      this.practiceStartTime = this.audio.now() + 0.35;
      this.practiceLastCueBeat = -1;
      this.practiceEvents = [];
    }
  }

  _updatePractice(dt) {
    const bpm = this.stage.bpm;
    const spb = 60 / bpm;
    this.currentBeat = this.audio.getLoopBeat();
    if (this.practicePhase !== "live") return;

    const pBeat = (this.audio.now() - this.practiceStartTime) / spb;
    if (pBeat < 0) return;

    // Schedule 4-beat practice call & response cycles continuously until 3 hits!
    const whole = Math.floor(pBeat);
    if (whole > this.practiceLastCueBeat) {
      this.practiceLastCueBeat = whole;
      const m = whole % 4;
      const cycleStart = whole - m;
      const targetTime = this.practiceStartTime + (cycleStart + 2) * spb;
      if (this.stage.id === "pacifier") {
        if (m === 0) {
          this.audio.playCue("baby_puff");
          this.vis.babyExpr = "puff"; this.vis.babyExprTimer = 0.5; this.vis.babyCheek.target = 1;
        } else if (m === 1) {
          this.audio.playCue("baby_spit");
          this.vis.babyExpr = "spit"; this.vis.babyExprTimer = 0.45; this.vis.babyCheek.target = 0;
          this.vis.pacifiers = [{ startBeat: pBeat, targetBeat: pBeat + 1, done: false }];
          this.practiceEvents.push({ beat: cycleStart + 2, time: targetTime, type: "tap", judged: false });
        }
      } else if (this.stage.id === "burp") {
        if (m === 0 || m === 1) {
          this.audio.playCue("pat_todak");
          this.vis.babyBounce.kick(5);
        }
        if (m === 1) {
          this.practiceEvents.push({ beat: cycleStart + 2, time: this.practiceStartTime + (cycleStart + 2) * spb, type: "tap", judged: false });
          this.practiceEvents.push({ beat: cycleStart + 3, time: this.practiceStartTime + (cycleStart + 3) * spb, type: "tap", judged: false });
        }
      } else if (this.stage.id === "photo") {
        if (m === 0) {
          this.audio.playCue("photo_peek");
          this.vis.fanOpen.target = 1;
        } else if (m === 2) {
          this.audio.playCue("photo_boo");
          this.vis.fanOpen.target = 0;
          this.vis.babyExpr = "sparkle"; this.vis.babyExprTimer = 0.65;
          this.practiceEvents.push({ beat: cycleStart + 3, time: this.practiceStartTime + (cycleStart + 3) * spb, type: "tap", judged: false });
        }
      } else if (this.stage.id === "ninja") {
        this.audio.playCue("count_tick");
        this.practiceEvents.push({ beat: whole + 1, time: this.practiceStartTime + (whole + 1) * spb, type: "tap", judged: false });
      }
    }

    // Expire missed practice targets cleanly
    const nowT = this.audio.now();
    for (const ev of this.practiceEvents) {
      if (!ev.judged && nowT - ev.time > 0.16) {
        ev.judged = true;
      }
    }
    this.currentBeat = pBeat;
  }

  // ===== MAIN STAGE PLAY ENGINE =====
  startMainPlay() {
    this._stopStageScheduler();
    this.audio.stopLoop();
    this.state = "PLAY";
    this.stateTime = 0;
    this.paused = false;
    this.vis.reset();
    this.cam.reset();
    this.particles.clear();

    this.chart = this.stage.buildChart();
    // Clone mutable judge state onto events
    for (const ev of this.chart.events) {
      ev.judged = false;
      ev.grade = null; // "perfect" | "good" | "miss"
    }

    this.activeSubStage = this.stage.isRemix ? "pacifier" : this.stage.id;
    this.songStartTime = this.audio.now() + 0.35;
    this.lastEighthScheduled = -1;
    this.nextCueIdx = 0;
    this.currentBeat = 0;
    this.lastWholeBeat = -1;
    this.holdingDown = false;
    this.activeHoldEv = null;
    this.combo = 0;
    this.maxCombo = 0;
    this.perfectCount = 0;
    this.goodCount = 0;
    this.missCount = 0;
    this.skillStarGot = false;
    this.perfectFailed = false;
    this.finishTriggered = false;
    this.lastDeltaMs = null;

    // Sample-accurate 20ms lookahead audio scheduler
    const tick = () => this._scheduleAudioAhead();
    tick();
    this.schedulerTimer = setInterval(tick, 20);
  }

  _stopStageScheduler() {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  togglePause() {
    if (this.state !== "PLAY" || this.finishTriggered) return;
    if (!this.paused) {
      this.paused = true;
      this.pauseStartedAt = this.audio.now();
      this._stopStageScheduler();
      this.audio.playCue("ui_back");
    } else {
      const pausedDur = this.audio.now() - this.pauseStartedAt;
      this.songStartTime += pausedDur;
      this.paused = false;
      this.audio.playCue("ui_ok");
      this.schedulerTimer = setInterval(() => this._scheduleAudioAhead(), 20);
    }
  }

  _subStageAtBeat(beat) {
    if (!this.stage.isRemix) return this.stage.id;
    let sub = "pacifier";
    for (const seg of this.chart.subTimeline) {
      if (beat >= seg.startBeat) sub = seg.subStage;
    }
    return sub;
  }

  _scheduleAudioAhead() {
    if (this.state !== "PLAY" || this.paused) return;
    const spb = 60 / this.stage.bpm;
    const secPerEighth = spb / 2;
    const now = this.audio.now();
    const horizon = now + 0.145;

    // 1. Schedule multi-track BGM eighth notes (skip stale past steps on tab wake/seek)
    while (true) {
      const nextStep = this.lastEighthScheduled + 1;
      const beatPos = nextStep / 2;
      if (beatPos >= this.chart.totalBeats - 2) break;
      const t = this.songStartTime + nextStep * secPerEighth;
      if (t > horizon) break;
      this.lastEighthScheduled = nextStep;
      if (t < now - 0.06) continue;
      // Don't play heavy BGM during count-in beats 0..3 (clean percussion count-in!)
      if (beatPos >= 4) {
        const sub = this._subStageAtBeat(beatPos);
        const transpose = this.chart.keyChangeBeat && beatPos >= this.chart.keyChangeBeat ? 2 : 0;
        this.audio.playStageEighth(this.stage.id, nextStep, Math.max(now, t), this.stage.bpm, transpose, sub);
      }
    }

    // 2. Schedule vocal & rhythm cues strictly onto AudioContext timestamps
    while (this.nextCueIdx < this.chart.cues.length) {
      const cue = this.chart.cues[this.nextCueIdx];
      const t = this.songStartTime + cue.beat * spb;
      if (t > horizon) break;
      this.nextCueIdx++;
      if (t < now - 0.06) continue;
      if (cue.kind) this.audio.playCue(cue.kind, Math.max(now, t));
    }
  }

  // Visual reactions driven right when the beat passes a cue!
  _processVisualCues(beat) {
    for (const cue of this.chart.cues) {
      if (cue._visFired || beat < cue.beat) continue;
      cue._visFired = true;

      if (cue.tag === "smash_cut") {
        this.activeSubStage = cue.subStage;
        this.vis.pacifiers = [];
        this.vis.fanOpen.set(0);
        this.vis.ninjaFrozen = false;
        this.cam.blackoutTarget = 0;
        this.cam.flash(0.55, "#FFFFFF");
        this.cam.hitPunch(0.08, (Math.random() < 0.5 ? -1 : 1) * 0.18);
        continue;
      }

      if (cue.tag === "skill_star") {
        this.vis.skillStarActive = true;
        this.cam.cinemaBarsTarget = 1;
        this.cam.zoom.target = 1.07;
        this.particles.spawnComicText(W * 0.5, 118, "★ 스킬 스타 찬스!", "#FFE156", 44, 1.1);
        continue;
      }

      // Stage-specific visual choreography
      if (cue.subStage === "pacifier") {
        if (cue.tag === "puff") {
          this.vis.babyExpr = "puff"; this.vis.babyExprTimer = 0.6;
          this.vis.babyCheek.target = 1;
          this.vis.babyBounce.kick(6);
        } else if (cue.tag === "lob_charge") {
          this.vis.babyExpr = "puff"; this.vis.babyExprTimer = 0.9;
          this.vis.babyCheek.target = 1;
          this.cam.zoom.target = 1.09;
        } else if (cue.tag === "spit" || cue.tag === "lob_spit") {
          this.vis.babyExpr = "spit"; this.vis.babyExprTimer = 0.45;
          this.vis.babyCheek.target = 0;
          this.vis.babyBounce.kick(-8);
          this.vis.pacifiers.push({
            startBeat: cue.beat,
            targetBeat: cue.targetBeat,
            lane: cue.lane || 0,
            isLob: cue.tag === "lob_spit",
            golden: !!cue.golden,
            done: false,
          });
        }
      } else if (cue.subStage === "burp") {
        if (cue.tag === "demo_pat") {
          this.vis.babyBounce.kick(5.5);
          this.cam.beatPulse(0.03);
        } else if (cue.tag === "burp_charge") {
          this.vis.babyExpr = "burp_charge"; this.vis.babyExprTimer = 1.5;
          this.vis.babyBelly.target = 1;
          this.cam.zoom.target = 1.1;
        } else if (cue.tag === "shh") {
          this.vis.shhMode = 1.0;
          this.vis.babyExpr = "sleepy"; this.vis.babyExprTimer = 1.5;
          this.cam.vignetteTarget = 0.44;
          this.cam.zoom.target = 1.06;
        }
      } else if (cue.subStage === "photo") {
        if (cue.tag === "peek") {
          this.vis.photoSide = 0;
          this.vis.fanOpen.target = 1;
          this.vis.sleepyDad = !!cue.sleepyDad;
          this.cam.panTo(0, 0, 1.03, 0);
        } else if (cue.tag === "boo") {
          this.vis.fanOpen.target = 0;
          this.vis.babyExpr = "sparkle"; this.vis.babyExprTimer = 0.8;
          this.vis.babyBounce.kick(-7);
          this.cam.zoom.target = 1.08;
        } else if (cue.tag === "whip_left") {
          this.vis.photoSide = -1;
          this.vis.babyExpr = "happy";
          this.cam.panTo(-65, -10, 1.07, -0.025);
        } else if (cue.tag === "whip_right") {
          this.vis.photoSide = 1;
          this.vis.babyExpr = "happy";
          this.cam.panTo(65, -10, 1.07, 0.025);
        } else if (cue.tag === "pose") {
          this.vis.photoSide = 0;
          this.vis.babyExpr = "sparkle"; this.vis.babyExprTimer = 1.7;
          this.cam.panTo(0, -18, 1.12, 0);
          this.particles.burstStars(610, 380, 10, ["#FFE156", "#FFFFFF"]);
        }
      } else if (cue.subStage === "ninja") {
        if (cue.tag === "freeze") {
          this.vis.ninjaFrozen = true;
          this.vis.ninjaMonitorAlert = 1.0;
          this.cam.zoom.target = 1.06;
          this.particles.spawnComicText(640, 290, "멈춰!!", "#FF5D8F", 52, 0.7);
        } else if (cue.tag === "go") {
          this.vis.ninjaFrozen = false;
          this.cam.zoom.target = 1.0;
        } else if (cue.tag === "lights_out") {
          this.cam.blackoutTarget = 1;
          this.particles.spawnComicText(640, 260, "암전! 리듬을 믿어!", "#72EFDD", 40, 0.9);
        } else if (cue.tag === "lights_on") {
          this.cam.blackoutTarget = 0;
          this.cam.flash(0.5, "#FFF9D6");
        } else if (cue.tag === "door_zoom") {
          this.cam.panTo(0, -60, 1.24, 0);
        }
      }
    }
  }

  // ===== JUDGEMENT ENGINE (TAP / HOLD / RELEASE / REST) =====
  _onActionPress() {
    this.holdingDown = true;

    if (this.state === "PRACTICE" && this.practicePhase === "live") {
      this._judgePracticeTap();
      return;
    }
    if (this.state !== "PLAY" || this.paused || this.finishTriggered) return;

    const spb = 60 / this.stage.bpm;
    const nowT = this.audio.now() - (this.audio.offsetMs / 1000);
    const hitBeat = (nowT - this.songStartTime) / spb;

    // 1. Check if player violated a REST guard!
    for (const ev of this.chart.events) {
      if (!ev.judged && ev.type === "rest") {
        const dtSec = (hitBeat - ev.beat) * spb;
        if (Math.abs(dtSec) <= 0.22) {
          ev.judged = true;
          ev.grade = "miss";
          this._onJudgeResult(ev, "miss", dtSec * 1000, true);
          return;
        }
      }
    }

    // 2. Find nearest unjudged TAP or HOLD event within hit window
    let best = null;
    let bestAbs = Infinity;
    let bestDt = 0;
    for (const ev of this.chart.events) {
      if (ev.judged) continue;
      if (ev.type !== "tap" && ev.type !== "hold") continue;
      const dtSec = (hitBeat - ev.beat) * spb;
      const abs = Math.abs(dtSec);
      if (abs < bestAbs && abs <= 0.165) {
        bestAbs = abs;
        best = ev;
        bestDt = dtSec;
      }
    }

    // Immediate tactile visual hand reaction regardless of hit
    this.vis.dadHand.kick(14);

    if (!best) {
      // Stray tap visual feedback (small swoosh/tap without harshly punishing unless rest violation)
      this.audio.playCue("woodblock");
      return;
    }

    best.judged = true;
    const grade = bestAbs <= 0.062 ? "perfect" : bestAbs <= 0.125 ? "good" : "miss";
    best.grade = grade;

    if (best.type === "hold" && grade !== "miss") {
      this.vis.holding = true;
      this.activeHoldEv = best;
    }
    this._onJudgeResult(best, grade, bestDt * 1000, false);
  }

  _onActionRelease() {
    if (!this.holdingDown) return;
    this.holdingDown = false;
    this.vis.holding = false;

    if (this.state !== "PLAY" || this.paused || this.finishTriggered) return;
    const spb = 60 / this.stage.bpm;
    const nowT = this.audio.now() - (this.audio.offsetMs / 1000);
    const relBeat = (nowT - this.songStartTime) / spb;

    // Look for nearest unjudged RELEASE event
    let best = null;
    let bestAbs = Infinity;
    let bestDt = 0;
    for (const ev of this.chart.events) {
      if (ev.judged || ev.type !== "release") continue;
      const dtSec = (relBeat - ev.beat) * spb;
      const abs = Math.abs(dtSec);
      if (abs < bestAbs && abs <= 0.185) {
        bestAbs = abs;
        best = ev;
        bestDt = dtSec;
      }
    }
    if (best) {
      best.judged = true;
      const grade = bestAbs <= 0.078 ? "perfect" : bestAbs <= 0.145 ? "good" : "miss";
      best.grade = grade;
      this._onJudgeResult(best, grade, bestDt * 1000, false);
    }
  }

  _judgePracticeTap() {
    const nowT = this.audio.now();
    this.vis.dadHand.kick(14);
    let hit = null;
    let bestAbs = Infinity;
    for (const ev of this.practiceEvents) {
      if (ev.judged) continue;
      const abs = Math.abs(nowT - ev.time);
      if (abs < bestAbs && abs <= 0.18) {
        bestAbs = abs;
        hit = ev;
      }
    }
    if (!hit) {
      this.audio.playCue("miss_bonk");
      return;
    }
    hit.judged = true;
    this.practiceSuccess++;
    this.vis.babyBounce.kick(-8);
    if (this.stage.id === "pacifier") {
      this.audio.playCue("dad_catch");
      this.vis.pacifiers.forEach((p) => (p.done = true));
      this.vis.babyExpr = "bliss"; this.vis.babyExprTimer = 0.55;
      this.particles.spawnComicText(640, 310, "쫍! 좋아요!", "#FFE156", 44);
    } else if (this.stage.id === "burp") {
      this.audio.playCue("pat_todak");
      this.particles.spawnComicText(760, 360, "토닥!", "#FFE156", 44);
    } else if (this.stage.id === "photo") {
      this.audio.playCue("shutter_snap");
      this.cam.flash(0.6, "#FFFFFF");
      this.particles.spawnComicText(640, 290, "찰칵! 최고!", "#FFE156", 44);
    } else {
      this.audio.playCue("ninja_step");
      this.vis.ninjaSteps++;
      this.particles.spawnComicText(640, 350, "살금!", "#72EFDD", 44);
    }
    this.particles.burstStars(640, 360, 12);
    this.cam.hitPunch(0.05);

    if (this.practiceSuccess >= this.practiceTargetSuccess) {
      this.practicePhase = "ready";
      this.audio.playCue("skill_star_hit");
      this.particles.spawnComicText(640, 330, "OK!! 실전 시작! ♪", "#FFE156", 60, 1.3);
      setTimeout(() => {
        if (this.state === "PRACTICE") this.startMainPlay();
      }, 1150);
    }
  }

  _onJudgeResult(ev, grade, deltaMs, restViolation) {
    this.lastDeltaMs = Math.round(deltaMs);
    const sub = ev.subStage || this.activeSubStage;

    // Close Skill Star drama bars right after its event resolves
    if (ev.skillStar) {
      this.vis.skillStarActive = false;
      this.cam.cinemaBarsTarget = 0;
      this.cam.zoom.target = 1;
    }

    if (grade === "perfect" || grade === "good") {
      if (grade === "perfect") this.perfectCount++;
      else this.goodCount++;
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      this.vis.fever = clamp(this.combo / 12, 0, 1);

      if (ev.sfx) this.audio.playCue(ev.sfx);
      if (grade === "good") this.audio.playCue("barely_wobble");

      // SKILL STAR EXPLOSION!!
      if (ev.skillStar && grade === "perfect") {
        this.skillStarGot = true;
        this.vis.skillStarBanner = 2.0;
        this.audio.playCue("skill_star_hit");
        this.cam.flash(0.68, "#FFF4B0");
        this.cam.hitPunch(0.11);
        this.particles.burstStars(640, 340, 26, ["#FFE156", "#FFFFFF", "#FF6B8B", "#7CE8FF"], 420);
        this.particles.spawnComicText(640, 175, "★ 스킬 스타 획득!! ★", "#FFE156", 54, 1.4);
      } else {
        this.cam.hitPunch(grade === "perfect" ? 0.055 : 0.025);
      }

      // Stage-specific joyful reactions!
      if (sub === "pacifier") {
        for (const p of this.vis.pacifiers) {
          if (!p.done && Math.abs(p.targetBeat - ev.beat) < 0.4) p.done = true;
        }
        this.vis.babyExpr = grade === "perfect" ? "bliss" : "happy";
        this.vis.babyExprTimer = 0.55;
        this.vis.dadExpr = "happy"; this.vis.dadExprTimer = 0.5;
        this.vis.babyBounce.kick(-9);
        this.particles.spawnRing(670, 355, grade === "perfect" ? "#FFE156" : "#7CE8FF", 130, 9);
        this.particles.burstStars(670, 355, grade === "perfect" ? 14 : 7);
        this.particles.spawnComicText(660, 255, grade === "good" ? "아슬!" : ev.comic, grade === "perfect" ? "#FFE156" : "#7CE8FF", 46);
        this.cam.zoom.target = 1;
      } else if (sub === "burp") {
        this.vis.babyBounce.kick(-8);
        if (ev.type === "release") {
          this.vis.babyExpr = "burp_boom"; this.vis.babyExprTimer = 0.9;
          this.vis.babyBelly.target = 0;
          this.cam.zoom.target = 1;
          this.cam.shake(0.32);
          for (let i = 0; i < 6; i++) this.particles.spawnBubble(680 + rand(-40, 40), 390, rand(18, 36), rand(-120, 120), rand(-220, -110));
          this.particles.burstNotes(680, 370, 8, "#FFE156");
          this.particles.spawnComicText(680, 240, ev.comic, "#FFE156", 58);
        } else if (ev.type === "rest") {
          this.vis.babyExpr = "sleepy"; this.vis.babyExprTimer = 0.7;
          this.cam.vignetteTarget = 0.14;
          this.cam.zoom.target = 1;
          this.particles.spawnComicText(680, 260, "Zzz... ♪", "#B5F8FF", 38);
        } else {
          this.particles.spawnRing(785, 445, "#FFE156", 90, 7);
          this.particles.spawnComicText(810, 370, ev.comic, "#FFE885", 40);
        }
      } else if (sub === "photo") {
        this.cam.flash(0.72, "#FFFFFF");
        this.vis.babyExpr = "sparkle"; this.vis.babyExprTimer = 0.65;
        this.vis.dadExpr = "thumbsup"; this.vis.dadExprTimer = 0.75;
        this.vis.sleepyDad = false;
        this.vis.babyBounce.kick(-9);
        this.vis.photoSnapshots.push({
          x: this.vis.photoSnapshots.length % 2 === 0 ? 310 + rand(-40, 40) : 960 + rand(-40, 40),
          y: 250 + rand(-30, 30),
          rot: rand(-0.22, 0.22), good: true, label: grade === "perfect" ? "인생샷!" : "좋아요!", age: 0,
        });
        if (this.vis.photoSnapshots.length > 3) this.vis.photoSnapshots.shift();
        this.particles.burstStars(610, 380, 12);
        this.particles.spawnComicText(620, 230, ev.comic, "#FFE156", 48);
        this.cam.panTo(0, 0, 1, 0);
      } else if (sub === "ninja") {
        if (ev.meta && ev.meta.kind === "door") {
          this.vis.ninjaDoorOpen = 1;
          this.vis.dadExpr = "thumbsup"; this.vis.dadExprTimer = 3;
          this.cam.godRaysTarget = 1;
          this.cam.flash(0.8, "#FFF4B0");
          this.particles.spawnConfetti(640, 300, 45, 480);
          this.particles.spawnComicText(640, 220, ev.comic, "#FFE156", 58, 1.3);
        } else if (ev.type === "rest") {
          this.particles.spawnComicText(640, 340, ev.comic, "#72EFDD", 36);
        } else {
          this.vis.ninjaSteps++;
          this.vis.dadExpr = "focus"; this.vis.dadExprTimer = 0.35;
          this.particles.spawnRing(640, 608, "#72EFDD", 72, 6);
        }
      }
    } else {
      // COMEDIC MISS REACTION!!
      this.missCount++;
      this.combo = 0;
      this.vis.fever = 0;
      this.cam.missKick();

      if (sub === "ninja" && restViolation) {
        this.audio.playCue("duck_squeak");
        this.vis.ninjaDuckSquish = 1;
        this.vis.ninjaMonitorAlert = 1.6;
        this.vis.dadExpr = "shock"; this.vis.dadExprTimer = 0.85;
        this.particles.spawnComicText(640, 290, "삐약!! 들켰다!", "#FF4D79", 54);
      } else {
        this.audio.playCue("miss_bonk");
        if (sub === "pacifier") {
          this.audio.playCue("baby_giggle");
          this.vis.dadExpr = "bonk"; this.vis.dadExprTimer = 0.9;
          this.vis.dadBump = true;
          this.vis.babyExpr = "giggle"; this.vis.babyExprTimer = 0.85;
          this.particles.spawnSweat(285, 510);
          this.particles.spawnComicText(360, 450, "딱!! 앗 따거!", "#FF5D8F", 46);
        } else if (sub === "burp") {
          this.vis.babyBelly.target = 0;
          this.vis.babyExpr = "shock"; this.vis.babyExprTimer = 0.9;
          this.cam.vignetteTarget = 0.14;
          this.cam.zoom.target = 1;
          this.particles.spawnSweat(680, 340);
          this.particles.spawnComicText(680, 260, restViolation ? "응애?! 깼다!!" : "엇박자!", "#FF5D8F", 46);
        } else if (sub === "photo") {
          this.vis.babyExpr = "mischievous"; this.vis.babyExprTimer = 0.8;
          this.vis.photoSnapshots.push({
            x: 640 + rand(-180, 180), y: 270, rot: rand(-0.25, 0.25),
            good: false, label: "아빠 코골이", age: 0,
          });
          this.particles.spawnSweat(825, 390);
          this.particles.spawnComicText(640, 250, "어긋났다!", "#FF5D8F", 44);
          this.cam.panTo(0, 0, 1, 0);
        } else if (sub === "ninja") {
          this.vis.ninjaMonitorAlert = 1.2;
          this.vis.dadExpr = "shock"; this.vis.dadExprTimer = 0.7;
          this.particles.spawnSweat(640, 420);
          this.particles.spawnComicText(640, 330, "삐걱!!", "#FF5D8F", 44);
        }
      }

      // If in Perfect Challenge Mode, immediate comedic challenge break!
      if (this.perfectChallengeMode && !this.perfectFailed) {
        this.perfectFailed = true;
        this.particles.spawnComicText(640, 150, "💔 퍼펙트 도전 실패!", "#FF4D79", 48, 1.6);
      }
    }
  }

  _updatePlay(dt) {
    if (this.paused) return;
    const spb = 60 / this.stage.bpm;
    const beat = (this.audio.now() - this.songStartTime) / spb;
    this.currentBeat = beat;

    if (beat < 0) return;

    // Beat pulse camera micro-bounce
    const whole = Math.floor(beat);
    if (whole > this.lastWholeBeat && whole >= 4) {
      this.lastWholeBeat = whole;
      this.cam.beatPulse(0.018 + this.vis.fever * 0.014);
    }

    this._processVisualCues(beat);

    // QA Auto-Play Bot (?bot=perfect | ?bot=sloppy)
    if (this.botMode) {
      for (const ev of this.chart.events) {
        if (ev.judged) continue;
        if (ev.type === "rest") continue;
        const targetB = ev.beat + (this.botMode === "sloppy" ? 0.09 : 0.002);
        if (beat >= targetB) {
          if (ev.type === "tap" || ev.type === "hold") {
            this._onActionPress();
          } else if (ev.type === "release") {
            this._onActionRelease();
          }
        }
      }
    }

    // Auto-resolve missed events & successful REST events!
    for (const ev of this.chart.events) {
      if (ev.judged) continue;
      const dtSec = (beat - ev.beat) * spb;
      if (ev.type === "rest" && dtSec > 0.14) {
        ev.judged = true;
        ev.grade = "perfect";
        this._onJudgeResult(ev, "perfect", 0, false);
      } else if (ev.type !== "rest" && dtSec > 0.165) {
        ev.judged = true;
        ev.grade = "miss";
        if (ev.type === "hold") this.vis.holding = false;
        this._onJudgeResult(ev, "miss", dtSec * 1000, false);
      }
    }

    // Expire un-caught flying pacifiers gracefully
    for (const p of this.vis.pacifiers) {
      if (!p.done && beat > p.targetBeat + 0.35) p.done = true;
    }

    // Climax Finale God-Rays & Celebration on last 4 beats!
    if (beat >= this.chart.totalBeats - 4 && !this.vis.finale) {
      this.vis.finale = true;
      this.cam.blackoutTarget = 0;
      this.cam.cinemaBarsTarget = 0;
      this.cam.godRaysRainbow = !!this.stage.isRemix;
      this.cam.godRaysTarget = 1.0;
      this.vis.babyExpr = "bliss";
      this.vis.dadExpr = "thumbsup";
      this.particles.spawnConfetti(W * 0.5, 220, 48, 520);
      this.audio.crash(this.audio.now(), 0.5);
    }

    // End of stage -> circular Iris Wipe -> 5-Step Narrative Epilogue Result!
    if (beat >= this.chart.totalBeats - 1.2 && !this.finishTriggered) {
      this.finishTriggered = true;
      this.cam.irisTarget = 0;
      setTimeout(() => {
        if (this.state === "PLAY") this.enterResult();
      }, 950);
    }
  }

  // ===== 5-STEP RHYTHM HEAVEN RESULT & EPILOGUE =====
  enterResult() {
    this._stopStageScheduler();
    this.audio.stopLoop(); // Intentional dramatic silence!
    this.state = "RESULT";
    this.stateTime = 0;
    this.cam.reset();
    this.particles.clear();

    const total = Math.max(1, this.chart.events.length);
    const weighted = this.perfectCount * 1.0 + this.goodCount * 0.7;
    const acc = Math.round((weighted / total) * 100);
    const rank = acc >= 85 ? "superb" : acc >= 64 ? "ok" : "tryagain";
    const perfectCleared = this.perfectChallengeMode && !this.perfectFailed && this.missCount === 0;

    // Pick dynamic witty review line
    const baseLine = pick(this.stage.reviews[rank]);
    let extra = "";
    if (perfectCleared) extra = " 노미스 퍼펙트 달성! 진정한 육퇴의 신!";
    else if (this.skillStarGot) extra = " 황금 스킬 스타까지 완벽하게 낚아챘네요!";
    else if (rank === "superb" && this.missCount === 0) extra = " 단 한 번의 실수도 없는 무결점 리듬!";

    // Update persistent save & Rhythm IQ!
    const prev = this.save.stages[this.stage.id] || { rank: null, bestAcc: 0, skillStar: false, medal: false, perfect: false, played: false };
    const rankOrder = { tryagain: 1, ok: 2, superb: 3 };
    const bestRank = !prev.rank || rankOrder[rank] >= rankOrder[prev.rank] ? rank : prev.rank;
    const iqDelta = rank === "superb" ? (this.skillStarGot ? 4 : 3) : rank === "ok" ? 1 : -1;
    const newIQ = clamp(this.save.rhythmIQ + iqDelta, 50, 120);

    this.save.stages[this.stage.id] = {
      rank: bestRank,
      bestAcc: Math.max(prev.bestAcc || 0, acc),
      skillStar: prev.skillStar || this.skillStarGot,
      medal: prev.medal || rank === "superb",
      perfect: prev.perfect || perfectCleared,
      played: true,
    };
    this.save.rhythmIQ = newIQ;
    if (!this.save.remixUnlocked && this.countClearedCoreStages() >= 2) {
      this.save.remixUnlocked = true;
    }
    writeSave(this.save);

    this.result = {
      acc,
      rank,
      reviewText: baseLine + extra,
      perfectCount: this.perfectCount,
      goodCount: this.goodCount,
      missCount: this.missCount,
      maxCombo: this.maxCombo,
      skillStarGot: this.skillStarGot,
      perfectCleared,
      iqDelta,
      newIQ,
    };
    this.resultStampSpring.set(0);
    this.resultStamped = false;
    this.resultTypedChars = 0;
    this.resultTypeAcc = 0;
    this.saveToast = 0;
  }

  _triggerResultStamp() {
    if (this.resultStamped) return;
    this.resultStamped = true;
    this.resultTypedChars = this.result.reviewText.length;
    this.resultStampSpring.target = 1;
    this.resultStampSpring.kick(14);
    this.audio.playCue("stamp_slap");
    this.cam.shake(0.5);
    this.cam.flash(0.45, this.result.rank === "superb" ? "#FFF1A8" : "#FFFFFF");
    this.saveToast = 3.2;

    if (this.result.rank === "superb") {
      this.particles.spawnConfetti(W * 0.5, 250, 50, 500);
      this.audio.startLoop("epilogue_superb", 122);
    } else if (this.result.rank === "ok") {
      this.particles.burstStars(360, 460, 16);
      this.audio.startLoop("epilogue_ok", 112);
    } else {
      this.audio.startLoop("epilogue_tryagain", 96);
    }
  }

  // ===== 8-BEAT INTERACTIVE CALIBRATION =====
  _updateCalibration() {
    const spb = 60 / 110;
    const beat = (this.audio.now() - this.calStartTime) / spb;
    const whole = Math.floor(beat);
    if (whole > this.calLastTick && whole >= 0) {
      this.calLastTick = whole;
      this.audio.playCue(whole % 4 === 0 ? "count_go" : "count_tick");
    }
  }

  _onCalibrateTap() {
    const spb = 60 / 110;
    const beat = (this.audio.now() - this.calStartTime) / spb;
    const nearest = Math.round(beat);
    const errMs = (beat - nearest) * spb * 1000;
    if (Math.abs(errMs) < 220) {
      this.calTaps.push(errMs);
      this.audio.playCue("dad_catch");
      this.particles.spawnRing(W * 0.5, 360, "#FFE156", 120, 8);
      if (this.calTaps.length >= 8) {
        const sorted = [...this.calTaps].sort((a, b) => a - b);
        const med = Math.round(sorted[3] * 0.5 + sorted[4] * 0.5);
        this.save.offsetMs = clamp(med, -150, 150);
        this.audio.offsetMs = this.save.offsetMs;
        writeSave(this.save);
        this.particles.spawnComicText(W * 0.5, 250, `보정 완료! ${this.save.offsetMs >= 0 ? "+" : ""}${this.save.offsetMs}ms`, "#6BCB77", 44, 1.4);
        this.calTaps = [];
      }
    }
  }

  // ===== MAIN ANIMATION & RENDER LOOP =====
  _loop(ts) {
    const dt = clamp((ts - this.lastFrame) / 1000, 0.001, 0.05);
    this.lastFrame = ts;
    this.time += dt;
    this.stateTime += dt;

    this.cam.update(dt);
    this.particles.update(dt);
    this.vis.update(dt);
    if (this.unlockFlash > 0) this.unlockFlash = Math.max(0, this.unlockFlash - dt * 1.15);
    if (this.saveToast > 0) this.saveToast = Math.max(0, this.saveToast - dt);

    if (this.state === "TITLE_CARD") {
      if (this.stateTime >= 3.05) this._finishTitleCard();
    } else if (this.state === "PRACTICE") {
      this._updatePractice(dt);
    } else if (this.state === "PLAY") {
      this._updatePlay(dt);
    } else if (this.state === "RESULT") {
      this.resultStampSpring.update(dt);
      if (this.stateTime >= 1.45 && !this.resultStamped) {
        this.resultTypeAcc += dt * 32;
        while (this.resultTypeAcc >= 1 && this.resultTypedChars < this.result.reviewText.length) {
          this.resultTypeAcc -= 1;
          this.resultTypedChars++;
          if (this.resultTypedChars % 2 === 0) this.audio.playCue("ui_type");
        }
      }
      if (this.stateTime >= 3.05 && !this.resultStamped) {
        this._triggerResultStamp();
      }
    } else if (this.state === "CALIBRATE") {
      this._updateCalibration();
    }

    this._render();
    requestAnimationFrame((t) => this._loop(t));
  }

  _render() {
    const ctx = this.ctx;
    this.buttons.length = 0;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    if (this.state === "TITLE") this._renderTitle(ctx);
    else if (this.state === "MENU") this._renderMenu(ctx);
    else if (this.state === "TITLE_CARD") drawTitleCard(ctx, this.stage, this.stateTime, 3.05);
    else if (this.state === "PRACTICE") this._renderPractice(ctx);
    else if (this.state === "PLAY") this._renderPlay(ctx);
    else if (this.state === "RESULT") this._renderResult(ctx);
    else if (this.state === "SETTINGS") this._renderSettings(ctx);
    else if (this.state === "CALIBRATE") this._renderCalibrate(ctx);

    this.particles.draw(ctx);

    // "저장했습니다!" Rhythm Heaven floating save toast
    if (this.saveToast > 0) {
      const a = clamp(this.saveToast > 0.5 ? 1 : this.saveToast / 0.5, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      roundRectPath(ctx, W - 235, 22, 206, 44, 22);
      ctx.fillStyle = "#1E1636"; ctx.fill();
      ctx.lineWidth = 3.5; ctx.strokeStyle = "#6BCB77"; ctx.stroke();
      drawStrokedText(ctx, "💾 저장했습니다!", W - 132, 44, 20, "#FFFFFF", INK, 3);
      ctx.restore();
    }

    ctx.restore();
  }

  // ===== RENDER: TITLE SCREEN =====
  _renderTitle(ctx) {
    const beat = this.time * (114 / 60);
    const bPulse = Math.pow(Math.max(0, 1 - (beat % 1) * 2.2), 2);

    // Vibrant twilight-to-candy gradient
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#241347");
    bg.addColorStop(0.55, "#5B2A86");
    bg.addColorStop(1, "#FF6B9D");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Spinning pastel sunburst
    ctx.save();
    ctx.translate(W * 0.5, H * 0.45);
    ctx.rotate(this.time * 0.12);
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    for (let i = 0; i < 16; i++) {
      ctx.rotate(Math.PI / 8);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-34, -900); ctx.lineTo(34, -900); ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    // Floating decorative pacifiers & musical notes
    for (let i = 0; i < 10; i++) {
      const fx = ((i * 155 + this.time * 24) % (W + 120)) - 60;
      const fy = 110 + Math.sin(this.time * 1.4 + i) * 45 + (i % 3) * 160;
      ctx.save();
      ctx.globalAlpha = 0.22;
      drawStrokedText(ctx, i % 2 ? "♪" : "★", fx, fy, 42, "#FFE156", INK, 0);
      ctx.restore();
    }

    // Cast showcase bouncing on the beat!
    drawDad(ctx, { x: 285, y: 505 - bPulse * 14, scale: 1.38, mode: "victory", expr: "thumbsup", ninjaBand: true });
    drawPhotographer(ctx, { x: 995, y: 495, scale: 1.2, fanOpen: 0.15, bounce: -bPulse * 14 });
    drawBaby(ctx, {
      x: 640, y: 465 - bPulse * 20, scale: 1.52,
      sx: 1 + bPulse * 0.08, sy: 1 - bPulse * 0.06,
      expr: "sparkle", crown: true, handsOnCheeks: true, onesie: "#7CE8FF",
    });
    drawPacifier(ctx, 475, 425 + Math.sin(this.time * 4) * 12, 1.3, Math.sin(this.time * 3) * 0.4, true);
    drawRubberDuck(ctx, 815, 535, 1.25, bPulse * 0.25);

    // Chunky Rhythm-Heaven 3D extruded Title Logo!
    ctx.save();
    ctx.translate(640, 175);
    ctx.scale(1 + bPulse * 0.035, 1 + bPulse * 0.035);
    // Pill top subtitle
    roundRectPath(ctx, -230, -104, 460, 42, 21);
    ctx.fillStyle = INK; ctx.fill();
    ctx.lineWidth = 3.5; ctx.strokeStyle = "#FFE156"; ctx.stroke();
    drawStrokedText(ctx, "★  새벽 2시의 하이퍼 육퇴 리듬 천국  ★", 0, -83, 21, "#FFE156", INK, 0);

    // 3D drop shadow
    drawStrokedText(ctx, "베이비 비트 천국", 6, 10, 96, INK, INK, 22);
    // Main gradient text
    drawStrokedText(ctx, "베이비 비트 천국", 0, 0, 96, "#FFE156", INK, 20);
    drawStrokedText(ctx, "BABY BEAT HEAVEN", 0, 74, 30, "#FFFFFF", INK, 8, "center", FONT_NUM);
    ctx.restore();

    // Pulsing golden CTA pill!
    const ctaSc = 1 + bPulse * 0.06;
    ctx.save();
    ctx.translate(640, 628);
    ctx.scale(ctaSc, ctaSc);
    roundRectPath(ctx, -225, -36, 450, 72, 36);
    ctx.fillStyle = "#FF3E6C"; ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = "#FFFFFF"; ctx.stroke();
    drawStrokedText(ctx, "▶  클릭 / SPACE 로 시작!  ♪", 0, 1, 30, "#FFFFFF", INK, 6);
    ctx.restore();
  }

  // ===== RENDER: MASCOT STAGE-SELECT MAP (Rhythm Heaven Miracle Stars!) =====
  _renderMenu(ctx) {
    const st = STAGES[this.selectedIdx];
    const beat = this.audio.getLoopBeat();
    const bPulse = Math.pow(Math.max(0, 1 - (beat % 1) * 2.2), 2);

    // [L0] Dynamically morphing stage-theme gradient background!
    this.menuBgTop = lerpHex(this.menuBgTop, st.themeTop, 0.08);
    this.menuBgBot = lerpHex(this.menuBgBot, st.themeBot, 0.08);
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, this.menuBgTop);
    bg.addColorStop(1, this.menuBgBot);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // [L1] Floating rotating translucent wireframe squares (iconic Rhythm Heaven menu depth!)
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.13)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
      const qx = ((i * 173 + this.time * (14 + (i % 3) * 6)) % (W + 180)) - 90;
      const qy = ((i * 119 + Math.sin(this.time * 0.7 + i) * 35) % (H + 100)) - 50;
      const sz = 44 + (i % 4) * 26;
      ctx.save();
      ctx.translate(qx, qy);
      ctx.rotate(this.time * (0.18 + (i % 3) * 0.08) * (i % 2 ? 1 : -1));
      ctx.strokeRect(-sz * 0.5, -sz * 0.5, sz, sz);
      ctx.restore();
    }
    ctx.restore();

    // Header Logo & Progress Strip
    drawStrokedText(ctx, "베이비 비트 천국", 68, 52, 42, "#FFE156", INK, 9, "left");
    drawStrokedText(ctx, "스테이지를 선택하세요 ♪", 68, 92, 20, "rgba(255,255,255,0.88)", INK, 4, "left");

    // [L2] Left Column: 5 Interactive Stage Tiles!
    const tileX = 68, tileW = 475, tileH = 92, gap = 16;
    const startY = 128;

    for (let i = 0; i < STAGES.length; i++) {
      const item = STAGES[i];
      const ty = startY + i * (tileH + gap);
      const selected = i === this.selectedIdx;
      const unlocked = this.isStageUnlocked(item);
      const rec = this.save.stages[item.id];
      const hovered = this._registerBtn(`tile_${item.id}`, tileX, ty, tileW, tileH, () => {
        if (this.selectedIdx === i) this._tryLaunchSelected(true);
        else {
          this.selectedIdx = i;
          this.audio.playCue("ui_move");
        }
      });

      ctx.save();
      const shiftX = selected ? 14 : hovered ? 6 : 0;
      ctx.translate(tileX + shiftX, ty);

      // Card shadow
      ctx.fillStyle = "rgba(15, 8, 28, 0.34)";
      roundRectPath(ctx, 5, 7, tileW, tileH, 20); ctx.fill();

      // Card body
      roundRectPath(ctx, 0, 0, tileW, tileH, 20);
      ctx.fillStyle = !unlocked ? "#4A4663" : item.isRemix ? "#32175E" : selected ? "#FFFDF7" : "rgba(255, 250, 244, 0.9)";
      ctx.fill();
      ctx.lineWidth = selected ? 5 : 3.5;
      ctx.strokeStyle = selected ? "#39FF88" : INK;
      ctx.stroke();

      // Stage Number Badge
      roundRectPath(ctx, 14, 15, 62, 62, 16);
      ctx.fillStyle = unlocked ? item.badgeColor : "#6E6A85";
      ctx.fill();
      ctx.lineWidth = 3.5; ctx.strokeStyle = INK; ctx.stroke();
      drawStrokedText(ctx, unlocked ? item.number : "🔒", 45, 47, 28, "#FFFFFF", INK, 5, "center", FONT_NUM);

      // Title & Genre
      const titleCol = !unlocked ? "#CFCBDF" : item.isRemix ? "#FFE156" : INK;
      drawStrokedText(ctx, unlocked ? item.title : "??? (2스테이지 클리어 시 해금!)", 94, 34, 25, titleCol, item.isRemix ? INK : "#FFFFFF", item.isRemix ? 5 : 0, "left");
      drawStrokedText(ctx, unlocked ? `${item.genre} · ${item.bpm} BPM` : "4개 육아 대작전의 그랜드 리믹스!", 94, 66, 17, item.isRemix ? "#E2D4FF" : "#6D5B7B", "#FFFFFF", 0, "left");

      // Badges: NEW / Rank / Skill Star / Medal / Perfect Crown
      if (unlocked) {
        if (!rec || !rec.played) {
          roundRectPath(ctx, tileW - 84, -10, 74, 28, 14);
          ctx.fillStyle = "#FF3E6C"; ctx.fill();
          ctx.lineWidth = 3; ctx.strokeStyle = "#FFFFFF"; ctx.stroke();
          drawStrokedText(ctx, "NEW!", tileW - 47, 5, 16, "#FFFFFF", INK, 3, "center", FONT_NUM);
        } else {
          const rLabel = rec.rank === "superb" ? "아주 좋아" : rec.rank === "ok" ? "좋아" : "다시";
          const rCol = rec.rank === "superb" ? "#FFD93D" : rec.rank === "ok" ? "#6BCB77" : "#9E95B5";
          roundRectPath(ctx, tileW - 114, 16, 100, 32, 16);
          ctx.fillStyle = rCol; ctx.fill();
          ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
          drawStrokedText(ctx, rLabel, tileW - 64, 33, 17, INK, "#FFFFFF", 0);
          const icons = `${rec.medal ? "🏅" : ""}${rec.skillStar ? "★" : ""}${rec.perfect ? "👑" : ""}`;
          if (icons) drawStrokedText(ctx, icons, tileW - 64, 69, 20, "#FFE156", INK, 4);
        }
      }

      // Neon-green Rhythm Heaven animated corner brackets on selected tile!
      if (selected) {
        const pad = 6 + bPulse * 4;
        ctx.strokeStyle = "#39FF88";
        ctx.lineWidth = 5;
        const cLen = 18;
        const cs = [[-pad, -pad, 1, 1], [tileW + pad, -pad, -1, 1], [-pad, tileH + pad, 1, -1], [tileW + pad, tileH + pad, -1, -1]];
        for (const [cx, cy, dx, dy] of cs) {
          ctx.beginPath(); ctx.moveTo(cx + dx * cLen, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + dy * cLen); ctx.stroke();
        }
      }
      ctx.restore();
    }

    // [L2/L3] Right Info Panel with PERCHED BOUNCING MASCOT ON TOP BORDER!
    const px = 615, py = 160, pw = 595, ph = 450;
    ctx.save();
    // Panel drop shadow
    ctx.fillStyle = "rgba(15, 8, 28, 0.35)";
    roundRectPath(ctx, px + 8, py + 10, pw, ph, 32); ctx.fill();

    // Signature Rhythm Heaven glossy blue rounded info card!
    const cardGrad = ctx.createLinearGradient(px, py, px, py + ph);
    cardGrad.addColorStop(0, "#2B7FFF");
    cardGrad.addColorStop(1, "#184BB5");
    roundRectPath(ctx, px, py, pw, ph, 32);
    ctx.fillStyle = cardGrad; ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = "#FFFFFF"; ctx.stroke();

    // Inner info window
    const unlocked = this.isStageUnlocked(st);
    const rec = this.save.stages[st.id];
    roundRectPath(ctx, px + 26, py + 34, pw - 52, 232, 22);
    ctx.fillStyle = "rgba(16, 28, 72, 0.42)"; ctx.fill();

    drawStrokedText(ctx, unlocked ? st.title : "미라클 리믹스 (잠김)", px + pw * 0.5, py + 76, 38, "#FFE156", INK, 8);
    drawStrokedText(ctx, unlocked ? st.subtitle : "스테이지 2개 이상을 「좋아」 이상으로 클리어하세요!", px + pw * 0.5, py + 122, 21, "#FFFFFF", INK, 4);

    // Controls & Best Record pills inside card
    roundRectPath(ctx, px + 56, py + 150, pw - 112, 42, 21);
    ctx.fillStyle = "rgba(255, 255, 255, 0.16)"; ctx.fill();
    drawStrokedText(ctx, `조작: ${st.controlsHint}  ·  ${st.bpm} BPM`, px + pw * 0.5, py + 172, 19, "#B5F8FF", INK, 3);

    const bestStr = rec && rec.played
      ? `최고 정확도 ${rec.bestAcc}%   ${rec.medal ? "🏅 메달" : "메달 미획득"}   ${rec.skillStar ? "★ 스킬스타" : "☆ 스킬스타"}`
      : "아직 플레이 기록이 없어요! 첫 도전을 시작해 보세요 ♪";
    drawStrokedText(ctx, bestStr, px + pw * 0.5, py + 232, 19, "#FFF3B0", INK, 4);

    // Primary CTA Buttons inside right card
    if (unlocked) {
      const hPlay = this._registerBtn("btn_play_practice", px + 34, py + 286, 330, 68, () => this._tryLaunchSelected(true));
      roundRectPath(ctx, px + 34, py + 286, 330, 68, 34);
      ctx.fillStyle = hPlay ? "#FF5983" : "#FF3E6C"; ctx.fill();
      ctx.lineWidth = 4.5; ctx.strokeStyle = "#FFFFFF"; ctx.stroke();
      drawStrokedText(ctx, "▶  연습 후 시작! ♪", px + 199, py + 321, 27, "#FFFFFF", INK, 6);

      const hSkip = this._registerBtn("btn_play_direct", px + 380, py + 286, 182, 68, () => this._tryLaunchSelected(false));
      roundRectPath(ctx, px + 380, py + 286, 182, 68, 34);
      ctx.fillStyle = hSkip ? "#FFE97A" : "#FFE156"; ctx.fill();
      ctx.lineWidth = 4.5; ctx.strokeStyle = INK; ctx.stroke();
      drawStrokedText(ctx, "⚡ 바로 실전", px + 471, py + 321, 24, INK, "#FFFFFF", 0);

      // Optional Perfect Challenge Button (unlocked once stage cleared or demoUnlockAll!)
      const canPerf = (rec && (rec.rank === "superb" || rec.rank === "ok")) || this.save.demoUnlockAll;
      const hPerf = this._registerBtn("btn_perfect", px + 34, py + 368, pw - 68, 56, () => {
        if (canPerf) this.startStage(st.id, false, true);
        else this.audio.playCue("miss_bonk");
      });
      roundRectPath(ctx, px + 34, py + 368, pw - 68, 56, 28);
      ctx.fillStyle = canPerf ? (hPerf ? "#53279B" : "#3C1A75") : "rgba(20, 28, 60, 0.45)";
      ctx.fill();
      ctx.lineWidth = 3.5; ctx.strokeStyle = canPerf ? "#FFE156" : "rgba(255,255,255,0.25)"; ctx.stroke();
      drawStrokedText(
        ctx,
        canPerf ? `👑 퍼펙트 도전 (노미스 챌린지)${rec && rec.perfect ? "  — 달성 완료!" : ""}` : "👑 퍼펙트 도전 (스테이지 클리어 시 개방)",
        px + pw * 0.5, py + 397, 21, canPerf ? "#FFE156" : "rgba(255,255,255,0.55)", INK, 4
      );
    } else {
      const hUnlockNow = this._registerBtn("btn_demo_unlock", px + 110, py + 315, pw - 220, 68, () => {
        this.save.demoUnlockAll = true;
        this.save.remixUnlocked = true;
        this.save.remixUnlockSeen = true;
        writeSave(this.save);
        this.unlockFlash = 1.0;
        this.audio.playCue("unlock_burst");
        this.particles.spawnConfetti(W * 0.5, H * 0.45, 50, 500);
      });
      roundRectPath(ctx, px + 110, py + 315, pw - 220, 68, 34);
      ctx.fillStyle = hUnlockNow ? "#FFE97A" : "#FFE156"; ctx.fill();
      ctx.lineWidth = 4.5; ctx.strokeStyle = INK; ctx.stroke();
      drawStrokedText(ctx, "🔓 리믹스 바로 해금하기!", px + pw * 0.5, py + 350, 25, INK, "#FFFFFF", 0);
    }
    ctx.restore();

    // [L3] INDEPENDENT ANIMATED MASCOT PERCHED ON TOP OF BLUE INFO CARD!!
    const mascotMood = !unlocked ? "locked" : st.isRemix ? "remix" : this.unlockFlash > 0.1 ? "celebrate" : "happy";
    drawMascot(ctx, px + pw - 96, py - 4, beat, mascotMood);

    // Bottom Meta Bar: Medals, Skill Stars, Rhythm IQ, & Settings button!
    const medals = STAGES.filter((s) => this.save.stages[s.id]?.medal).length;
    const stars = STAGES.filter((s) => this.save.stages[s.id]?.skillStar).length;
    roundRectPath(ctx, 68, 648, 860, 52, 26);
    ctx.fillStyle = "rgba(18, 12, 34, 0.72)"; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(255,255,255,0.28)"; ctx.stroke();
    drawStrokedText(ctx, `🏅 메달  ${medals} / 5`, 185, 675, 22, "#FFE156", INK, 4);
    drawStrokedText(ctx, `★ 스킬 스타  ${stars} / 5`, 420, 675, 22, "#7CE8FF", INK, 4);
    drawStrokedText(ctx, `🎵 리듬 지수  ${this.save.rhythmIQ}`, 680, 675, 22, "#6BCB77", INK, 4);

    const hSet = this._registerBtn("btn_settings", 954, 646, 256, 56, () => this.openSettings());
    roundRectPath(ctx, 954, 646, 256, 56, 28);
    ctx.fillStyle = hSet ? "#4B3B78" : "#2D214F"; ctx.fill();
    ctx.lineWidth = 3.5; ctx.strokeStyle = "#FFFFFF"; ctx.stroke();
    drawStrokedText(ctx, "⚙  설정 · 박자 보정", 1082, 675, 22, "#FFFFFF", INK, 4);

    // Massive White Rhythm-Heaven Unlock Light-Wave Flash!
    if (this.unlockFlash > 0.01) {
      ctx.save();
      ctx.globalAlpha = clamp(this.unlockFlash, 0, 1);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  // ===== RENDER: IN-WORLD CONVERSATIONAL PRACTICE =====
  _renderPractice(ctx) {
    this.cam.applyWorld(ctx);
    renderStageWorld(ctx, this.activeSubStage, this.currentBeat, this.vis, this.cam);
    this.cam.endWorld(ctx);
    this.cam.drawPostFX(ctx);

    // Frosted Sky Dialogue Banner (slim & clean, never covers center characters or mobile!)
    const bx = 110, by = 16, bw = 1060, bh = 80;
    ctx.save();
    roundRectPath(ctx, bx, by, bw, bh, 24);
    ctx.fillStyle = "rgba(255, 253, 248, 0.9)"; ctx.fill();
    ctx.lineWidth = 4.5; ctx.strokeStyle = INK; ctx.stroke();

    if (this.practicePhase === "dialogue") {
      const line = this.stage.practiceLines[this.practiceLineIdx] || "";
      drawStrokedText(ctx, line, bx + bw * 0.5, by + 33, 25, INK, "#FFFFFF", 0);
      const blink = Math.sin(this.time * 7) > 0;
      drawStrokedText(ctx, blink ? "클릭 / SPACE 로 계속 ▶" : "클릭 / SPACE 로 계속", bx + bw - 135, by + 62, 16, "#FF3E6C", "#FFFFFF", 0);
    } else if (this.practicePhase === "live") {
      drawStrokedText(ctx, `실전 연습! 소리를 듣고 박자에 맞춰 탭하세요!  (${this.practiceSuccess} / ${this.practiceTargetSuccess})`, bx + bw * 0.5, by + 26, 22, INK, "#FFFFFF", 0);
      for (let i = 0; i < this.practiceTargetSuccess; i++) {
        const hx = bx + bw * 0.5 + (i - 1) * 52;
        drawStrokedText(ctx, i < this.practiceSuccess ? "♥" : "♡", hx, by + 57, 28, i < this.practiceSuccess ? "#FF3E6C" : "#B5A8C4", INK, 3);
      }
    } else {
      drawStrokedText(ctx, "완벽해요!! 이제 본 무대로 출발합니다! ♪", bx + bw * 0.5, by + 40, 28, "#FF3E6C", "#FFFFFF", 0);
    }
    ctx.restore();

    // Rhythm Heaven Bottom-Right "X 스킵" Pill Button (clean open space!)
    const hSkip = this._registerBtn("btn_skip_practice", W - 210, H - 74, 178, 50, () => {
      this.audio.playCue("ui_ok");
      this.startMainPlay();
    });
    roundRectPath(ctx, W - 210, H - 74, 178, 50, 25);
    ctx.fillStyle = hSkip ? "#3D2E68" : "rgba(24, 16, 44, 0.88)"; ctx.fill();
    ctx.lineWidth = 3.5; ctx.strokeStyle = "#FFFFFF"; ctx.stroke();
    drawStrokedText(ctx, "✕  스킵 (X)", W - 121, H - 48, 21, "#FFFFFF", INK, 4);
  }

  // ===== RENDER: MAIN ZERO-HUD GAMEPLAY =====
  _renderPlay(ctx) {
    this.cam.applyWorld(ctx);
    renderStageWorld(ctx, this.activeSubStage, this.currentBeat, this.vis, this.cam);
    this.cam.endWorld(ctx);

    const blackoutDraw = this.activeSubStage === "ninja"
      ? (c, a) => drawNinjaBlackoutEyes(c, a, this.currentBeat, this.vis)
      : null;
    this.cam.drawPostFX(ctx, blackoutDraw);

    // Optional Accessibility Visual Beat Pulse (OFF by default for pure Zero-HUD!)
    if (this.save.visualGuide && this.currentBeat >= 0) {
      const frac = this.currentBeat % 1;
      const r = 14 + Math.pow(1 - frac, 3) * 14;
      ctx.save();
      ctx.beginPath(); ctx.arc(W * 0.5, H - 30, r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 225, 86, 0.72)"; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      ctx.restore();
    }

    // Discreet Top-Left Pause button (Zero-HUD friendly)
    const hPause = this._registerBtn("btn_pause", 24, 22, 54, 46, () => this.togglePause());
    roundRectPath(ctx, 24, 22, 54, 46, 14);
    ctx.fillStyle = hPause ? "rgba(40,28,70,0.9)" : "rgba(20,14,36,0.52)"; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = "rgba(255,255,255,0.65)"; ctx.stroke();
    drawStrokedText(ctx, "❚❚", 51, 45, 20, "#FFFFFF", INK, 3);

    // Remix subtle stage label pill top-center during first 2 beats of a world switch
    if (this.stage.isRemix) {
      const subName = { pacifier: "쪽쪽이!", burp: "트림!", photo: "사진관!", ninja: "닌자 탈출!" }[this.activeSubStage] || "";
      roundRectPath(ctx, W * 0.5 - 88, 18, 176, 36, 18);
      ctx.fillStyle = "rgba(22, 12, 42, 0.65)"; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = "#FFE156"; ctx.stroke();
      drawStrokedText(ctx, `★ REMIX · ${subName}`, W * 0.5, 37, 18, "#FFE156", INK, 3);
    }

    // Perfect Challenge subtle top-left badge
    if (this.perfectChallengeMode) {
      roundRectPath(ctx, 90, 24, 178, 42, 21);
      ctx.fillStyle = this.perfectFailed ? "#552035" : "#421B7A"; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = this.perfectFailed ? "#FF4D79" : "#FFE156"; ctx.stroke();
      drawStrokedText(ctx, this.perfectFailed ? "💔 도전 실패" : "👑 퍼펙트 도전", 179, 46, 19, "#FFE156", INK, 3);
    }

    // Pause Overlay Modal
    if (this.paused) {
      ctx.fillStyle = "rgba(12, 8, 24, 0.72)";
      ctx.fillRect(0, 0, W, H);
      roundRectPath(ctx, 410, 180, 460, 355, 32);
      ctx.fillStyle = "#2A1C4E"; ctx.fill();
      ctx.lineWidth = 5; ctx.strokeStyle = "#FFFFFF"; ctx.stroke();
      drawStrokedText(ctx, "일시정지", 640, 245, 44, "#FFE156", INK, 8);

      const b1 = this._registerBtn("p_resume", 475, 295, 330, 58, () => this.togglePause());
      roundRectPath(ctx, 475, 295, 330, 58, 29); ctx.fillStyle = b1 ? "#FF5C8A" : "#FF3E6C"; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = "#FFFFFF"; ctx.stroke();
      drawStrokedText(ctx, "▶  계속 플레이", 640, 325, 25, "#FFFFFF", INK, 5);

      const b2 = this._registerBtn("p_retry", 475, 368, 330, 58, () => this.startStage(this.stage.id, false, this.perfectChallengeMode));
      roundRectPath(ctx, 475, 368, 330, 58, 29); ctx.fillStyle = b2 ? "#FFE97A" : "#FFE156"; ctx.fill(); ctx.strokeStyle = INK; ctx.stroke();
      drawStrokedText(ctx, "↻  처음부터 다시", 640, 398, 24, INK, "#FFFFFF", 0);

      const b3 = this._registerBtn("p_menu", 475, 441, 330, 58, () => this.goMenu());
      roundRectPath(ctx, 475, 441, 330, 58, 29); ctx.fillStyle = b3 ? "#534284" : "#3E2F68"; ctx.fill(); ctx.strokeStyle = "#FFFFFF"; ctx.stroke();
      drawStrokedText(ctx, "🏠  스테이지 선택으로", 640, 471, 23, "#FFFFFF", INK, 4);
    }
  }

  // ===== RENDER: 5-STEP RHYTHM HEAVEN RESULT & EPILOGUE =====
  _renderResult(ctx) {
    const r = this.result;
    // Background transitions from dramatic black silence -> warm epilogue backdrop on stamp!
    if (!this.resultStamped) {
      ctx.fillStyle = "#120B21";
      ctx.fillRect(0, 0, W, H);
    } else {
      const bg = ctx.createLinearGradient(0, 0, W, H);
      if (r.rank === "superb") { bg.addColorStop(0, "#3A186B"); bg.addColorStop(1, "#FF5E8A"); }
      else if (r.rank === "ok") { bg.addColorStop(0, "#1C3E6E"); bg.addColorStop(1, "#37A69B"); }
      else { bg.addColorStop(0, "#231E38"); bg.addColorStop(1, "#453B63"); }
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
    }

    // Step 2: Reviewer Pill Badge slides in at 0.9s
    if (this.stateTime > 0.9) {
      const slide = Ease.outBack(clamp((this.stateTime - 0.9) / 0.45, 0, 1));
      ctx.save();
      ctx.translate(lerp(-350, 74, slide), 74);
      roundRectPath(ctx, 0, 0, 420, 56, 28);
      ctx.fillStyle = "#FFFDF7"; ctx.fill();
      ctx.lineWidth = 4.5; ctx.strokeStyle = INK; ctx.stroke();
      drawStrokedText(ctx, `💬  ${this.stage.reviewer}`, 210, 29, 24, INK, "#FFFFFF", 0);
      ctx.restore();
    }

    // Step 3: Typewriter witty review with pixel-accurate auto-wrapping!
    if (this.stateTime > 1.35) {
      const shown = r.reviewText.slice(0, this.resultTypedChars);
      roundRectPath(ctx, 74, 150, 586, 140, 24);
      ctx.fillStyle = "rgba(255, 255, 255, 0.13)"; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = "rgba(255, 255, 255, 0.32)"; ctx.stroke();
      ctx.save();
      ctx.font = `900 25px ${FONT_MAIN}`;
      const words = shown.split(" ");
      const lines = [];
      let cur = "";
      for (const w of words) {
        const test = cur ? cur + " " + w : w;
        if (ctx.measureText(test).width > 528 && cur) {
          lines.push(cur);
          cur = w;
        } else cur = test;
      }
      if (cur) lines.push(cur);
      ctx.restore();
      const baseY = lines.length <= 2 ? 198 : 182;
      for (let i = 0; i < Math.min(lines.length, 3); i++) {
        drawStrokedText(ctx, lines[i], 102, baseY + i * 38, 25, i === 0 ? "#FFFFFF" : "#FFE156", INK, 5, "left");
      }
    }

    // Step 4 & 5: STAMP IMPACT + 6-DIRECTIONAL COMIC SPEEDLINES + 1-CUT EPILOGUE COMIC!
    if (this.resultStamped) {
      const stSc = Math.max(0.01, this.resultStampSpring.val);
      const stampX = 355, stampY = 415;

      // 6-directional comic burst lines behind stamp
      ctx.save();
      ctx.translate(stampX, stampY);
      ctx.strokeStyle = r.rank === "superb" ? "#FFE156" : "#FFFFFF";
      ctx.lineWidth = 6;
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 + 0.2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 125, Math.sin(a) * 75);
        ctx.lineTo(Math.cos(a) * 185, Math.sin(a) * 112);
        ctx.stroke();
      }
      ctx.rotate(-0.14);
      ctx.scale(stSc, stSc);
      const stampCol = r.rank === "superb" ? "#FF3E6C" : r.rank === "ok" ? "#2EC4B6" : "#7C7499";
      const stampTxt = r.rank === "superb" ? "아주 좋아!" : r.rank === "ok" ? "좋아!" : "다시 한번...";
      roundRectPath(ctx, -172, -62, 344, 124, 28);
      ctx.fillStyle = stampCol; ctx.fill();
      ctx.lineWidth = 8; ctx.strokeStyle = "#FFFFFF"; ctx.stroke();
      roundRectPath(ctx, -162, -52, 324, 104, 22);
      ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
      drawStrokedText(ctx, stampTxt, 0, 2, 58, "#FFFFFF", INK, 11);
      ctx.restore();

      // Stats pill bar under stamp
      roundRectPath(ctx, 74, 535, 575, 62, 22);
      ctx.fillStyle = "rgba(18, 12, 34, 0.72)"; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.stroke();
      drawStrokedText(ctx, `정확도 ${r.acc}%  ·  PERFECT ${r.perfectCount}  ·  MISS ${r.missCount}`, 362, 567, 22, "#FFFFFF", INK, 4);

      // Right side: BESPOKE ANIMATED 1-CUT EPILOGUE COMIC ILLUSTRATION!!
      const cardPop = Ease.outBack(clamp((this.stateTime - 3.05) / 0.55, 0, 1));
      ctx.save();
      ctx.translate(955, 345);
      ctx.scale(cardPop, cardPop);
      drawEpilogueComic(ctx, -235, -210, 470, 420, this.stage.id, r.rank, this.time);
      ctx.restore();

      // Action buttons at bottom!
      const hRe = this._registerBtn("res_retry", 74, 620, 275, 66, () => this.startStage(this.stage.id, false, this.perfectChallengeMode));
      roundRectPath(ctx, 74, 620, 275, 66, 33);
      ctx.fillStyle = hRe ? "#FFE97A" : "#FFE156"; ctx.fill();
      ctx.lineWidth = 4.5; ctx.strokeStyle = INK; ctx.stroke();
      drawStrokedText(ctx, "↻  한 판 더!", 212, 654, 27, INK, "#FFFFFF", 0);

      const hMenu = this._registerBtn("res_menu", 374, 620, 275, 66, () => this.goMenu());
      roundRectPath(ctx, 374, 620, 275, 66, 33);
      ctx.fillStyle = hMenu ? "#FF5C8A" : "#FF3E6C"; ctx.fill();
      ctx.lineWidth = 4.5; ctx.strokeStyle = "#FFFFFF"; ctx.stroke();
      drawStrokedText(ctx, "▶  스테이지 맵으로", 512, 654, 26, "#FFFFFF", INK, 5);
    }
  }

  // ===== RENDER: SETTINGS OVERLAY =====
  _renderSettings(ctx) {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#1D1338");
    bg.addColorStop(1, "#33225C");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    roundRectPath(ctx, 220, 62, 840, 596, 34);
    ctx.fillStyle = "#2A1C50"; ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = "#FFFFFF"; ctx.stroke();
    drawStrokedText(ctx, "⚙  설정 및 박자 보정", 640, 122, 42, "#FFE156", INK, 8);

    // Offset row
    drawStrokedText(ctx, `오디오 타이밍 보정:  ${this.save.offsetMs >= 0 ? "+" : ""}${this.save.offsetMs} ms`, 470, 210, 26, "#FFFFFF", INK, 5);
    const hMinus = this._registerBtn("off_m", 730, 184, 64, 52, () => {
      this.save.offsetMs = clamp(this.save.offsetMs - 5, -150, 150);
      this.audio.offsetMs = this.save.offsetMs; writeSave(this.save); this.audio.playCue("ui_move");
    });
    roundRectPath(ctx, 730, 184, 64, 52, 16); ctx.fillStyle = hMinus ? "#5E4A99" : "#443475"; ctx.fill(); ctx.stroke();
    drawStrokedText(ctx, "-5", 762, 211, 24, "#FFFFFF", INK, 3);

    const hPlus = this._registerBtn("off_p", 806, 184, 64, 52, () => {
      this.save.offsetMs = clamp(this.save.offsetMs + 5, -150, 150);
      this.audio.offsetMs = this.save.offsetMs; writeSave(this.save); this.audio.playCue("ui_move");
    });
    roundRectPath(ctx, 806, 184, 64, 52, 16); ctx.fillStyle = hPlus ? "#5E4A99" : "#443475"; ctx.fill(); ctx.stroke();
    drawStrokedText(ctx, "+5", 838, 211, 24, "#FFFFFF", INK, 3);

    const hCal = this._registerBtn("btn_cal", 884, 184, 138, 52, () => this.startCalibration());
    roundRectPath(ctx, 884, 184, 138, 52, 16); ctx.fillStyle = hCal ? "#FFE97A" : "#FFE156"; ctx.fill(); ctx.strokeStyle = INK; ctx.stroke();
    drawStrokedText(ctx, "8박 측정", 953, 211, 22, INK, "#FFFFFF", 0);

    // Visual Beat Guide Toggle
    const hVis = this._registerBtn("btn_vis", 290, 278, 700, 68, () => {
      this.save.visualGuide = !this.save.visualGuide; writeSave(this.save); this.audio.playCue("ui_ok");
    });
    roundRectPath(ctx, 290, 278, 700, 68, 24);
    ctx.fillStyle = hVis ? "#4A377D" : "#3A2966"; ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = "#FFFFFF"; ctx.stroke();
    drawStrokedText(ctx, `접근성 시각 박자 점 (하단 보조 점):   ${this.save.visualGuide ? "ON" : "OFF (Zero-HUD 기본)"}`, 640, 313, 24, "#FFFFFF", INK, 4);

    // Master Volume Cycle
    const hVol = this._registerBtn("btn_vol", 290, 366, 700, 68, () => {
      const levels = [1.0, 0.86, 0.6, 0.3, 0.0];
      const idx = levels.findIndex((v) => Math.abs(v - this.save.masterVol) < 0.08);
      this.save.masterVol = levels[(idx + 1) % levels.length];
      this.audio.masterVol = this.save.masterVol; this.audio.applyVolumes(); writeSave(this.save); this.audio.playCue("ui_ok");
    });
    roundRectPath(ctx, 290, 366, 700, 68, 24);
    ctx.fillStyle = hVol ? "#4A377D" : "#3A2966"; ctx.fill(); ctx.stroke();
    drawStrokedText(ctx, `전체 음량:   ${Math.round(this.save.masterVol * 100)}%   (클릭하여 변경)`, 640, 401, 24, "#FFFFFF", INK, 4);

    // Demo Unlock All Toggle
    const hDemo = this._registerBtn("btn_demo_all", 290, 454, 700, 68, () => {
      this.save.demoUnlockAll = !this.save.demoUnlockAll;
      if (this.save.demoUnlockAll) this.save.remixUnlocked = true;
      writeSave(this.save); this.audio.playCue("unlock_burst");
    });
    roundRectPath(ctx, 290, 454, 700, 68, 24);
    ctx.fillStyle = hDemo ? "#5E2B85" : "#441E66"; ctx.fill(); ctx.strokeStyle = "#FFE156"; ctx.stroke();
    drawStrokedText(ctx, `🔓 리믹스 & 퍼펙트 도전 전체 해금:   ${this.save.demoUnlockAll ? "ON" : "OFF"}`, 640, 489, 24, "#FFE156", INK, 4);

    // Back button
    const hBack = this._registerBtn("set_back", 480, 562, 320, 62, () => this.goMenu());
    roundRectPath(ctx, 480, 562, 320, 62, 31);
    ctx.fillStyle = hBack ? "#FF5C8A" : "#FF3E6C"; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = "#FFFFFF"; ctx.stroke();
    drawStrokedText(ctx, "✓  돌아가기", 640, 594, 26, "#FFFFFF", INK, 5);
  }

  // ===== RENDER: INTERACTIVE 8-BEAT CALIBRATION =====
  _renderCalibrate(ctx) {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#151233"); bg.addColorStop(1, "#2A245E");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    const spb = 60 / 110;
    const beat = Math.max(0, (this.audio.now() - this.calStartTime) / spb);
    const pulse = Math.pow(Math.max(0, 1 - (beat % 1) * 2.5), 2);

    drawStrokedText(ctx, "🎵  8박 오디오 박자 보정", 640, 110, 46, "#FFE156", INK, 9);
    drawStrokedText(ctx, "메트로놈 소리에 맞춰 SPACE 또는 화면을 8번 탭하세요!", 640, 168, 24, "#FFFFFF", INK, 4);

    // Pulsing metronome ring
    ctx.beginPath(); ctx.arc(640, 360, 88 + pulse * 36, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 225, 86, ${0.18 + pulse * 0.4})`; ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = "#FFE156"; ctx.stroke();
    drawStrokedText(ctx, `${this.calTaps.length} / 8`, 640, 362, 48, "#FFFFFF", INK, 8, "center", FONT_NUM);

    drawStrokedText(ctx, `현재 보정값: ${this.save.offsetMs >= 0 ? "+" : ""}${this.save.offsetMs} ms`, 640, 520, 26, "#72EFDD", INK, 5);

    const hDone = this._registerBtn("cal_back", 480, 588, 320, 62, () => this.openSettings());
    roundRectPath(ctx, 480, 588, 320, 62, 31);
    ctx.fillStyle = hDone ? "#FF5C8A" : "#FF3E6C"; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = "#FFFFFF"; ctx.stroke();
    drawStrokedText(ctx, "설정으로 돌아가기", 640, 620, 24, "#FFFFFF", INK, 5);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("game");
  if (canvas) new BabyBeatHeavenApp(canvas);
});
