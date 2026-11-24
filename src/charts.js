// 5 Hand-Crafted Flagship Stage Charts, Practice Scripts, Theme Palettes, & Comedic Reviews
// Event schema:
//   { id, beat, type: "tap"|"hold"|"release"|"rest", subStage, cueBeat, cues: [{beat, kind, tag}], skillStar?, meta? }
// Cues are scheduled sample-accurately by the audio lookahead clock and drive character anticipation!

function buildPacifierChart() {
  const events = [];
  const cues = [];
  let eid = 1;

  // Count-in beats 0..3
  cues.push({ beat: 0, kind: "count_tick", tag: "1", subStage: "pacifier" });
  cues.push({ beat: 1, kind: "count_tick", tag: "2", subStage: "pacifier" });
  cues.push({ beat: 2, kind: "count_tick", tag: "3", subStage: "pacifier" });
  cues.push({ beat: 3, kind: "count_go", tag: "GO!", subStage: "pacifier" });

  function addSingle(b, opts = {}) {
    cues.push({ beat: b, kind: "baby_puff", tag: "puff", subStage: "pacifier" });
    cues.push({ beat: b + 1, kind: "baby_spit", tag: "spit", subStage: "pacifier", targetBeat: b + 2, golden: !!opts.skillStar });
    events.push({
      id: `p_${eid++}`, beat: b + 2, type: "tap", subStage: "pacifier",
      cueBeat: b + 1, sfx: "dad_catch", comic: "쫍!", skillStar: !!opts.skillStar,
      meta: { kind: "single", spitBeat: b + 1 },
    });
  }

  function addDouble(b) {
    cues.push({ beat: b, kind: "baby_puff", tag: "puff", subStage: "pacifier" });
    cues.push({ beat: b + 1, kind: "baby_spit", tag: "spit", subStage: "pacifier", targetBeat: b + 2, lane: -1 });
    cues.push({ beat: b + 1.5, kind: "baby_spit", tag: "spit", subStage: "pacifier", targetBeat: b + 2.5, lane: 1 });
    events.push({
      id: `p_${eid++}`, beat: b + 2, type: "tap", subStage: "pacifier",
      cueBeat: b + 1, sfx: "dad_catch", comic: "쫍!",
      meta: { kind: "double1", spitBeat: b + 1, lane: -1 },
    });
    events.push({
      id: `p_${eid++}`, beat: b + 2.5, type: "tap", subStage: "pacifier",
      cueBeat: b + 1.5, sfx: "dad_catch", comic: "쫍!!",
      meta: { kind: "double2", spitBeat: b + 1.5, lane: 1 },
    });
  }

  function addMegaLob(b, skillStar = false) {
    if (skillStar) cues.push({ beat: b - 1, kind: "skill_star_cue", tag: "skill_star", subStage: "pacifier" });
    cues.push({ beat: b, kind: "baby_lob", tag: "lob_charge", subStage: "pacifier" });
    cues.push({ beat: b + 1, kind: "baby_spit", tag: "lob_spit", subStage: "pacifier", targetBeat: b + 3, golden: skillStar });
    events.push({
      id: `p_${eid++}`, beat: b + 3, type: "tap", subStage: "pacifier",
      cueBeat: b + 1, sfx: "dad_catch", comic: skillStar ? "★ 대성공!!" : "나이스 캐치!",
      skillStar, meta: { kind: "lob", spitBeat: b + 1 },
    });
  }

  // Section 1: Establish groove (Beats 4..19)
  addSingle(4);
  addSingle(8);
  addSingle(12);
  addSingle(16);

  // Section 2: Double-spit variation! (Beats 20..35)
  addSingle(20);
  addDouble(24);
  addSingle(28);
  addDouble(32);

  // Section 3: Mega Lob drama + rapid interplay! (Beats 36..51)
  addMegaLob(36, false);
  addSingle(40);
  addDouble(44);
  addDouble(48);

  // Section 4: Climax + SKILL STAR Mega Lob + Finale! (Beats 52..68)
  addSingle(52);
  addDouble(56);
  addMegaLob(60, true); // SKILL STAR on beat 63!
  addSingle(64);

  return { totalBeats: 70, cues, events };
}

function buildBurpChart() {
  const events = [];
  const cues = [];
  let eid = 1;

  cues.push({ beat: 0, kind: "count_tick", tag: "1", subStage: "burp" });
  cues.push({ beat: 1, kind: "count_tick", tag: "2", subStage: "burp" });
  cues.push({ beat: 2, kind: "count_tick", tag: "3", subStage: "burp" });
  cues.push({ beat: 3, kind: "count_go", tag: "GO!", subStage: "burp" });

  // Call & Response 2-pat echo: Cue on b, b+1 -> Player taps on b+2, b+3
  function addPatEcho(b) {
    cues.push({ beat: b, kind: "pat_todak", tag: "demo_pat", subStage: "burp" });
    cues.push({ beat: b + 1, kind: "pat_todak", tag: "demo_pat", subStage: "burp" });
    events.push({
      id: `b_${eid++}`, beat: b + 2, type: "tap", subStage: "burp",
      cueBeat: b, sfx: "pat_todak", comic: "토닥!", meta: { kind: "pat" },
    });
    events.push({
      id: `b_${eid++}`, beat: b + 3, type: "tap", subStage: "burp",
      cueBeat: b + 1, sfx: "pat_todak", comic: "토닥!", meta: { kind: "pat" },
    });
  }

  // Symphonic Burp Hold-and-Release: Cue "으음~" on b -> HOLD on b+1 -> RELEASE on b+3!
  function addBurpHold(b, skillStar = false) {
    if (skillStar) cues.push({ beat: b - 1, kind: "skill_star_cue", tag: "skill_star", subStage: "burp" });
    cues.push({ beat: b, kind: "burp_charge", tag: "burp_charge", subStage: "burp", releaseBeat: b + 3, golden: skillStar });
    events.push({
      id: `b_${eid++}`, beat: b + 1, type: "hold", subStage: "burp",
      cueBeat: b, sfx: "pat_todak", comic: "꾸욱~", meta: { kind: "burp_hold", releaseBeat: b + 3 },
    });
    events.push({
      id: `b_${eid++}`, beat: b + 3, type: "release", subStage: "burp",
      cueBeat: b + 1, sfx: "baby_burp", comic: skillStar ? "★ 꺼어억!!" : "꺼억!!",
      skillStar, meta: { kind: "burp_release", holdBeat: b + 1 },
    });
  }

  // Sleepy Shh Rest Fakeout: Cue "쉿~" on b -> DO NOT TAP at b+2!
  function addShhRest(b) {
    cues.push({ beat: b, kind: "shh_cue", tag: "shh", subStage: "burp", restBeat: b + 2 });
    events.push({
      id: `b_${eid++}`, beat: b + 2, type: "rest", subStage: "burp",
      cueBeat: b, sfx: null, comic: "Zzz...", meta: { kind: "shh_rest" },
    });
  }

  // Section 1: Cozy groove pats & first burp (Beats 4..19)
  addPatEcho(4);
  addPatEcho(8);
  addBurpHold(12, false);
  addPatEcho(16);

  // Section 2: Introduce Sleepy Shush fakeout! (Beats 20..35)
  addBurpHold(20, false);
  addShhRest(24);
  addPatEcho(28);
  addBurpHold(32, false);

  // Section 3: Playful mix of pats, rests & burps (Beats 36..51)
  addShhRest(36);
  addPatEcho(40);
  addBurpHold(44, false);
  addPatEcho(48);

  // Section 4: Climax Symphony Burp SKILL STAR + Peaceful Finale (Beats 52..68)
  addShhRest(52);
  addPatEcho(56);
  addBurpHold(60, true); // SKILL STAR on beat 63!
  addShhRest(64);

  return { totalBeats: 70, cues, events };
}

function buildPhotoChart() {
  const events = [];
  const cues = [];
  let eid = 1;

  cues.push({ beat: 0, kind: "count_tick", tag: "1", subStage: "photo" });
  cues.push({ beat: 1, kind: "count_tick", tag: "2", subStage: "photo" });
  cues.push({ beat: 2, kind: "count_tick", tag: "3", subStage: "photo" });
  cues.push({ beat: 3, kind: "count_go", tag: "GO!", subStage: "photo" });

  // Classic Peek-a-Boo: "까—"(b) -> "꿍!!"(b+2) -> TAP "찰칵!"(b+3)
  function addPeekaboo(b, sleepyDad = false) {
    cues.push({ beat: b, kind: "photo_peek", tag: "peek", subStage: "photo", sleepyDad });
    cues.push({ beat: b + 2, kind: "photo_boo", tag: "boo", subStage: "photo", sleepyDad });
    events.push({
      id: `ph_${eid++}`, beat: b + 3, type: "tap", subStage: "photo",
      cueBeat: b + 2, sfx: "shutter_snap", comic: "찰칵!", meta: { kind: "peekaboo", sleepyDad },
    });
  }

  // Rapid Left-Right Whip-Pan: "여기!"(b) -> TAP(b+1), "저기!"(b+2) -> TAP(b+3)
  function addWhipPair(b) {
    cues.push({ beat: b, kind: "photo_here", tag: "whip_left", subStage: "photo" });
    events.push({
      id: `ph_${eid++}`, beat: b + 1, type: "tap", subStage: "photo",
      cueBeat: b, sfx: "shutter_snap", comic: "찰칵!", meta: { kind: "whip_left", side: -1 },
    });
    cues.push({ beat: b + 2, kind: "photo_here", tag: "whip_right", subStage: "photo" });
    events.push({
      id: `ph_${eid++}`, beat: b + 3, type: "tap", subStage: "photo",
      cueBeat: b + 2, sfx: "shutter_snap", comic: "찰칵!!", meta: { kind: "whip_right", side: 1 },
    });
  }

  // Angel Pose Double Snap: "포~즈!"(b) -> TAP(b+2) + TAP(b+3)!
  function addAngelPose(b, skillStar = false) {
    if (skillStar) cues.push({ beat: b - 1, kind: "skill_star_cue", tag: "skill_star", subStage: "photo" });
    cues.push({ beat: b, kind: "photo_pose", tag: "pose", subStage: "photo", golden: skillStar });
    events.push({
      id: `ph_${eid++}`, beat: b + 2, type: "tap", subStage: "photo",
      cueBeat: b, sfx: "shutter_snap", comic: "반짝!", meta: { kind: "pose1" },
    });
    events.push({
      id: `ph_${eid++}`, beat: b + 3, type: "tap", subStage: "photo",
      cueBeat: b, sfx: "shutter_snap", comic: skillStar ? "★ 인생샷!!" : "완벽해!",
      skillStar, meta: { kind: "pose2" },
    });
  }

  // Section 1: Classic studio warmup
  addPeekaboo(4, false);
  addPeekaboo(8, false);
  addWhipPair(12);
  addPeekaboo(16, true); // Sleepy Dad gag!

  // Section 2: Angel Pose + Whip-Pans
  addAngelPose(20, false);
  addWhipPair(24);
  addPeekaboo(28, true);
  addAngelPose(32, false);

  // Section 3: Studio overdrive!
  addWhipPair(36);
  addWhipPair(40);
  addPeekaboo(44, true);
  addAngelPose(48, false);

  // Section 4: Climax + SKILL STAR Angel Pose!
  addWhipPair(52);
  addPeekaboo(56, false);
  addAngelPose(60, true); // SKILL STAR on beat 63!
  addPeekaboo(64, true);

  return { totalBeats: 70, cues, events };
}

function buildNinjaChart() {
  const events = [];
  const cues = [];
  let eid = 1;

  cues.push({ beat: 0, kind: "count_tick", tag: "1", subStage: "ninja" });
  cues.push({ beat: 1, kind: "count_tick", tag: "2", subStage: "ninja" });
  cues.push({ beat: 2, kind: "count_tick", tag: "3", subStage: "ninja" });
  cues.push({ beat: 3, kind: "count_go", tag: "GO!", subStage: "ninja" });

  function addStep(b, blind = false) {
    events.push({
      id: `n_${eid++}`, beat: b, type: "tap", subStage: "ninja",
      cueBeat: b - 1, sfx: "ninja_step", comic: blind ? "살금..." : "살금!",
      meta: { kind: "step", blind, stepIndex: b },
    });
  }

  function addFreeze(b) {
    cues.push({ beat: b, kind: "ninja_freeze", tag: "freeze", subStage: "ninja" });
    events.push({
      id: `n_${eid++}`, beat: b + 1, type: "rest", subStage: "ninja",
      cueBeat: b, sfx: null, comic: "얼음!", meta: { kind: "freeze" },
    });
    events.push({
      id: `n_${eid++}`, beat: b + 2, type: "rest", subStage: "ninja",
      cueBeat: b, sfx: null, comic: "휴~", meta: { kind: "freeze" },
    });
    cues.push({ beat: b + 3, kind: "ninja_go", tag: "go", subStage: "ninja" });
  }

  // Walk 1 (Beats 4..11) — steady 8 beats to lock into stealth groove!
  for (let b = 4; b <= 11; b++) addStep(b, false);

  // Freeze 1 (Beats 12..15)
  addFreeze(12);

  // Walk 2 (Beats 16..23)
  for (let b = 16; b <= 23; b++) addStep(b, false);

  // Freeze 2 (Beats 24..27)
  addFreeze(24);

  // Walk 3 leading into BLACKOUT! (Beats 28..35)
  for (let b = 28; b <= 35; b++) addStep(b, false);

  // BLACKOUT BLIND STEALTH RUN #1! (Beats 36..41)
  cues.push({ beat: 36, kind: "ninja_lights_out", tag: "lights_out", subStage: "ninja", endBeat: 41 });
  for (let b = 37; b <= 40; b++) addStep(b, true);
  cues.push({ beat: 41, kind: "ninja_go", tag: "lights_on", subStage: "ninja" });

  // Walk + Freeze combo (Beats 42..51)
  for (let b = 42; b <= 47; b++) addStep(b, false);
  addFreeze(48);

  // BLACKOUT BLIND STEALTH RUN #2! (Beats 52..57)
  cues.push({ beat: 52, kind: "ninja_lights_out", tag: "lights_out", subStage: "ninja", endBeat: 57 });
  for (let b = 53; b <= 56; b++) addStep(b, true);
  cues.push({ beat: 57, kind: "ninja_go", tag: "lights_on", subStage: "ninja" });

  // Final dash to the golden exit door! (Beats 58..61)
  for (let b = 58; b <= 61; b++) addStep(b, false);

  // Dramatic Door Latch Finale (SKILL STAR on Beat 65!)
  cues.push({ beat: 62, kind: "skill_star_cue", tag: "skill_star", subStage: "ninja" });
  cues.push({ beat: 63, kind: "ninja_freeze", tag: "door_zoom", subStage: "ninja" });
  events.push({
    id: `n_${eid++}`, beat: 65, type: "tap", subStage: "ninja",
    cueBeat: 63, sfx: "door_click", comic: "★ 육퇴 성공!!",
    skillStar: true, meta: { kind: "door" },
  });

  return { totalBeats: 70, cues, events };
}

function buildRemixChart() {
  const events = [];
  const cues = [];
  let eid = 1;

  cues.push({ beat: 0, kind: "count_tick", tag: "1", subStage: "pacifier" });
  cues.push({ beat: 1, kind: "count_tick", tag: "2", subStage: "pacifier" });
  cues.push({ beat: 2, kind: "count_tick", tag: "3", subStage: "pacifier" });
  cues.push({ beat: 3, kind: "count_go", tag: "GO!", subStage: "pacifier" });

  const cut = (b, to) => cues.push({ beat: b, kind: "remix_cut", tag: "smash_cut", subStage: to });

  // ACT 1: PACIFIER (Beats 4..19)
  const pacSingle = (b) => {
    cues.push({ beat: b, kind: "baby_puff", tag: "puff", subStage: "pacifier" });
    cues.push({ beat: b + 1, kind: "baby_spit", tag: "spit", subStage: "pacifier", targetBeat: b + 2 });
    events.push({ id: `r_${eid++}`, beat: b + 2, type: "tap", subStage: "pacifier", cueBeat: b + 1, sfx: "dad_catch", comic: "쫍!", meta: { kind: "single", spitBeat: b + 1 } });
  };
  const pacDouble = (b) => {
    cues.push({ beat: b, kind: "baby_puff", tag: "puff", subStage: "pacifier" });
    cues.push({ beat: b + 1, kind: "baby_spit", tag: "spit", subStage: "pacifier", targetBeat: b + 2, lane: -1 });
    cues.push({ beat: b + 1.5, kind: "baby_spit", tag: "spit", subStage: "pacifier", targetBeat: b + 2.5, lane: 1 });
    events.push({ id: `r_${eid++}`, beat: b + 2, type: "tap", subStage: "pacifier", cueBeat: b + 1, sfx: "dad_catch", comic: "쫍!", meta: { kind: "double1", spitBeat: b + 1, lane: -1 } });
    events.push({ id: `r_${eid++}`, beat: b + 2.5, type: "tap", subStage: "pacifier", cueBeat: b + 1.5, sfx: "dad_catch", comic: "쫍!!", meta: { kind: "double2", spitBeat: b + 1.5, lane: 1 } });
  };
  pacSingle(4);
  pacSingle(8);
  pacDouble(12);
  pacSingle(16);

  // ACT 2: BURP ORCHESTRA (Beats 20..35)
  cut(20, "burp");
  const burpEcho = (b) => {
    cues.push({ beat: b, kind: "pat_todak", tag: "demo_pat", subStage: "burp" });
    cues.push({ beat: b + 1, kind: "pat_todak", tag: "demo_pat", subStage: "burp" });
    events.push({ id: `r_${eid++}`, beat: b + 2, type: "tap", subStage: "burp", cueBeat: b, sfx: "pat_todak", comic: "토닥!", meta: { kind: "pat" } });
    events.push({ id: `r_${eid++}`, beat: b + 3, type: "tap", subStage: "burp", cueBeat: b + 1, sfx: "pat_todak", comic: "토닥!", meta: { kind: "pat" } });
  };
  const burpHold = (b) => {
    cues.push({ beat: b, kind: "burp_charge", tag: "burp_charge", subStage: "burp", releaseBeat: b + 3 });
    events.push({ id: `r_${eid++}`, beat: b + 1, type: "hold", subStage: "burp", cueBeat: b, sfx: "pat_todak", comic: "꾸욱~", meta: { kind: "burp_hold", releaseBeat: b + 3 } });
    events.push({ id: `r_${eid++}`, beat: b + 3, type: "release", subStage: "burp", cueBeat: b + 1, sfx: "baby_burp", comic: "꺼억!!", meta: { kind: "burp_release", holdBeat: b + 1 } });
  };
  burpEcho(20);
  burpHold(24);
  cues.push({ beat: 28, kind: "shh_cue", tag: "shh", subStage: "burp", restBeat: 30 });
  events.push({ id: `r_${eid++}`, beat: 30, type: "rest", subStage: "burp", cueBeat: 28, sfx: null, comic: "Zzz...", meta: { kind: "shh_rest" } });
  burpHold(32);

  // ACT 3: PEEK-A-BOO STUDIO (Beats 36..51)
  cut(36, "photo");
  const photoPeek = (b) => {
    cues.push({ beat: b, kind: "photo_peek", tag: "peek", subStage: "photo", sleepyDad: true });
    cues.push({ beat: b + 2, kind: "photo_boo", tag: "boo", subStage: "photo", sleepyDad: true });
    events.push({ id: `r_${eid++}`, beat: b + 3, type: "tap", subStage: "photo", cueBeat: b + 2, sfx: "shutter_snap", comic: "찰칵!", meta: { kind: "peekaboo", sleepyDad: true } });
  };
  const photoWhip = (b) => {
    cues.push({ beat: b, kind: "photo_here", tag: "whip_left", subStage: "photo" });
    events.push({ id: `r_${eid++}`, beat: b + 1, type: "tap", subStage: "photo", cueBeat: b, sfx: "shutter_snap", comic: "찰칵!", meta: { kind: "whip_left", side: -1 } });
    cues.push({ beat: b + 2, kind: "photo_here", tag: "whip_right", subStage: "photo" });
    events.push({ id: `r_${eid++}`, beat: b + 3, type: "tap", subStage: "photo", cueBeat: b + 2, sfx: "shutter_snap", comic: "찰칵!!", meta: { kind: "whip_right", side: 1 } });
  };
  photoPeek(36);
  photoWhip(40);
  cues.push({ beat: 44, kind: "photo_pose", tag: "pose", subStage: "photo" });
  events.push({ id: `r_${eid++}`, beat: 46, type: "tap", subStage: "photo", cueBeat: 44, sfx: "shutter_snap", comic: "반짝!", meta: { kind: "pose1" } });
  events.push({ id: `r_${eid++}`, beat: 47, type: "tap", subStage: "photo", cueBeat: 44, sfx: "shutter_snap", comic: "완벽해!", meta: { kind: "pose2" } });
  photoWhip(48);

  // ACT 4: 3AM NINJA ESCAPE (Beats 52..67)
  cut(52, "ninja");
  for (let b = 52; b <= 55; b++) {
    events.push({ id: `r_${eid++}`, beat: b, type: "tap", subStage: "ninja", cueBeat: b - 1, sfx: "ninja_step", comic: "살금!", meta: { kind: "step", stepIndex: b } });
  }
  cues.push({ beat: 56, kind: "ninja_freeze", tag: "freeze", subStage: "ninja" });
  events.push({ id: `r_${eid++}`, beat: 57, type: "rest", subStage: "ninja", cueBeat: 56, sfx: null, comic: "얼음!", meta: { kind: "freeze" } });
  events.push({ id: `r_${eid++}`, beat: 58, type: "rest", subStage: "ninja", cueBeat: 56, sfx: null, comic: "휴~", meta: { kind: "freeze" } });
  cues.push({ beat: 59, kind: "ninja_go", tag: "go", subStage: "ninja" });
  cues.push({ beat: 60, kind: "ninja_lights_out", tag: "lights_out", subStage: "ninja", endBeat: 65 });
  for (let b = 61; b <= 64; b++) {
    events.push({ id: `r_${eid++}`, beat: b, type: "tap", subStage: "ninja", cueBeat: b - 1, sfx: "ninja_step", comic: "살금...", meta: { kind: "step", blind: true, stepIndex: b } });
  }
  cues.push({ beat: 65, kind: "ninja_go", tag: "lights_on", subStage: "ninja" });

  // ACT 5: RAPID 4-BEAT WORLD-SWITCHING CLIMAX (+2 SEMITONE KEY MODULATION AT BEAT 68!)
  cut(68, "pacifier");
  pacDouble(68);
  cut(72, "photo");
  photoWhip(72);
  cut(76, "burp");
  burpHold(76);
  cut(80, "pacifier");
  pacDouble(80);
  cut(84, "photo");
  photoPeek(84);

  // GRAND SKILL STAR FINALE (Beats 88..94): Ninja Door Click -> Rainbow God-Ray Explosion!
  cut(88, "ninja");
  for (let b = 88; b <= 90; b++) {
    events.push({ id: `r_${eid++}`, beat: b, type: "tap", subStage: "ninja", cueBeat: b - 1, sfx: "ninja_step", comic: "살금!", meta: { kind: "step", stepIndex: b } });
  }
  cues.push({ beat: 91, kind: "skill_star_cue", tag: "skill_star", subStage: "ninja" });
  cues.push({ beat: 92, kind: "ninja_freeze", tag: "door_zoom", subStage: "ninja" });
  events.push({
    id: `r_${eid++}`, beat: 94, type: "tap", subStage: "ninja",
    cueBeat: 92, sfx: "door_click", comic: "★ 육퇴 미라클!!",
    skillStar: true, meta: { kind: "door" },
  });

  // Sub-stage timeline map for Remix seamless rendering & BGM genre switches
  const subTimeline = [
    { startBeat: 0, subStage: "pacifier" },
    { startBeat: 20, subStage: "burp" },
    { startBeat: 36, subStage: "photo" },
    { startBeat: 52, subStage: "ninja" },
    { startBeat: 68, subStage: "pacifier" },
    { startBeat: 72, subStage: "photo" },
    { startBeat: 76, subStage: "burp" },
    { startBeat: 80, subStage: "pacifier" },
    { startBeat: 84, subStage: "photo" },
    { startBeat: 88, subStage: "ninja" },
  ];

  return { totalBeats: 100, keyChangeBeat: 68, cues, events, subTimeline };
}

const STAGES = [
  {
    id: "pacifier",
    number: "01",
    title: "쪽쪽이 스나이퍼",
    subtitle: "우웁 → 퉤! 날아오는 쪽쪽이를 정박에 쫍!",
    bpm: 116,
    badgeColor: "#FF5D8F",
    themeTop: "#2E1C59",
    themeBot: "#6A3EA1",
    accent: "#FFE156",
    genre: "시부야케이 브라스 펑크",
    controlsHint: "SPACE / 화면 탭",
    reviewer: "새벽 2시 아기 침대의 소감",
    reviews: {
      superb: ["번개 같은 손목 스냅에 감동했어요!", "이 집 아빠는 국가대표 쪽쪽이 포수네요!"],
      ok: ["아기 입에 쏙쏙 들어가는 게 제법 안정적이었어요.", "몇 번 이마에 맞았지만 훌륭한 방어력이었죠!"],
      tryagain: ["쪽쪽이가 천장까지 날아가는 걸 세 번이나 봤어요...", "우웁 → 퉤 다음 한 박자! 소리만 믿고 탭해 보세요!"],
    },
    practiceLines: [
      "아기가 볼을 빵빵하게 부풀리네요! ♪",
      "「우웁 → 퉤!」 소리가 들린 바로 다음 박자에 탭해서 쫍! 끼워 주세요 ♪",
      "좋아요! 이제 3번만 연속으로 연습해 볼까요? ♪",
    ],
    buildChart: buildPacifierChart,
  },
  {
    id: "burp",
    number: "02",
    title: "꺼억! 트림 오케스트라",
    subtitle: "토닥토닥 따라 치고, 「으음~」엔 꾹 눌렀다 떼기!",
    bpm: 108,
    badgeColor: "#FF9F1C",
    themeTop: "#5C2C1D",
    themeBot: "#C96A3A",
    accent: "#FFE885",
    genre: "스윙 빅밴드 재즈",
    controlsHint: "탭 · 꾹 누르다 떼기 · 쉿 참기",
    reviewer: "거실 흔들의자의 소감",
    reviews: {
      superb: ["이렇게 우아한 트림 심포니는 평생 처음이에요!", "흔들의자 리듬과 완벽하게 하나가 되셨네요!"],
      ok: ["따뜻한 손길 덕분에 아기 속이 아주 편해졌어요.", "트림 타이밍이 아주 구수하고 좋았습니다!"],
      tryagain: ["「쉿~」 할 때 건드리면 아기가 번쩍 깨버려요!", "「으음~」 소리에 꾹 눌렀다가 두 박자 뒤에 떼어 보세요!"],
    },
    practiceLines: [
      "등을 리듬에 맞춰 토닥토닥해 줘야 해요! ♪",
      "「토닥! 토닥!」 신호가 들리면 똑같이 두 번 따라 탭하세요 ♪",
      "「으음~」 할 땐 꾹 눌렀다 떼고, 「쉿~」 할 땐 참기! 3번 연습해요 ♪",
    ],
    buildChart: buildBurpChart,
  },
  {
    id: "photo",
    number: "03",
    title: "까꿍! 백일 사진관",
    subtitle: "「까—꿍!」 웃는 찰나에 셔터를 찰칵!",
    bpm: 122,
    badgeColor: "#00B4D8",
    themeTop: "#FF6F91",
    themeBot: "#FFB668",
    accent: "#FFFFFF",
    genre: "일렉트로 스윙 스튜디오 팝",
    controlsHint: "SPACE / 화면 탭",
    reviewer: "스튜디오 토끼 인형의 소감",
    reviews: {
      superb: ["셔터 타이밍이 예술! 백일 앨범이 화보집이 됐어요!", "아빠도 타이밍 좋게 깨어나서 완벽한 가족사진!"],
      ok: ["아기 미소를 기가 막히게 포착하셨어요!", "조금만 더 칼박이면 사진작가 스카우트 확정이에요!"],
      tryagain: ["아빠가 코 고는 순간만 골라서 찍으신 건 아니죠...?", "「까—꿍!」 또는 「여기!」 바로 다음 박자에 찰칵!"],
    },
    practiceLines: [
      "오늘은 아기 백일 기념 촬영 날이에요! ♪",
      "작가님이 「까—꿍!」 하고 부채를 열면 바로 다음 박자에 찰칵! ♪",
      "좌우로 외칠 때도 소리에 맞춰 3번 연습해 볼까요? ♪",
    ],
    buildChart: buildPhotoChart,
  },
  {
    id: "ninja",
    number: "04",
    title: "새벽 3시! 닌자 육퇴 탈출",
    subtitle: "박자 맞춰 살금살금! 불이 꺼져도 리듬을 잃지 마!",
    bpm: 112,
    badgeColor: "#7B2CBF",
    themeTop: "#131736",
    themeBot: "#2D3566",
    accent: "#72EFDD",
    genre: "스텔스 스파이 재즈",
    controlsHint: "매 박자 탭 · 멈춰!엔 정지",
    reviewer: "현관문 황동 손잡이의 소감",
    reviews: {
      superb: ["그림자보다 조용한 발걸음! 진정한 육퇴 닌자!", "불이 꺼진 암전 속에서도 흔들리지 않는 절대 박자감!"],
      ok: ["오리 인형을 아슬아슬하게 피해서 탈출 성공!", "현관문 달칵 소리가 오늘따라 유난히 달콤하네요!"],
      tryagain: ["오리 인형이 삐약! 울자마자 아기 눈이 레이저가 됐어요...", "박자에 맞춰 꾸준히 탭하다가 「멈춰!」 소리엔 2박자 참기!"],
    },
    practiceLines: [
      "드디어 아기가 잠들었어요! 몰래 방을 빠져나가요 ♪",
      "음악 박자에 맞춰 매 박자 살금살금 탭하세요! ♪",
      "「멈춰!」 소리가 나면 2박자 얼음! 불이 꺼져도 박자를 유지해요 ♪",
    ],
    buildChart: buildNinjaChart,
  },
  {
    id: "remix",
    number: "★",
    title: "육퇴 미라클 리믹스",
    subtitle: "4가지 육아 대작전이 한 곡에! 초고속 메들리 피날레!",
    bpm: 124,
    badgeColor: "#FF3E6C",
    themeTop: "#FF4D8D",
    themeBot: "#5E2BFF",
    accent: "#FFE156",
    genre: "그랜드 하이퍼 메들리",
    controlsHint: "모든 기술 총동원!",
    reviewer: "지나가던 옆집 고양이의 소감",
    reviews: {
      superb: ["새벽 2시에 이 집에서 콘서트 여는 줄 알았다옹! 전설이다옹!", "완벽한 육퇴 미라클! 온 동네가 박수 치고 있다옹!"],
      ok: ["화면이 휙휙 바뀌는데도 끝까지 리듬을 지켜냈다옹!", "내일 밤에도 이 실력이면 육퇴는 따놓은 당상이다옹!"],
      tryagain: ["장면이 바뀔 때 귀를 쫑긋 세우면 박자가 들린다옹!", "앞선 4개 스테이지의 신호를 떠올리며 다시 도전해 보라옹!"],
    },
    practiceLines: [
      "축하해요! 대망의 육퇴 미라클 리믹스 무대입니다! ♪",
      "쪽쪽이·트림·사진관·닌자 탈출이 박자에 맞춰 휙휙 전환돼요 ♪",
      "준비되셨나요? 귀를 활짝 열고 미라클 쇼타임! ♪",
    ],
    isRemix: true,
    buildChart: buildRemixChart,
  },
];

function getStageById(id) {
  return STAGES.find((s) => s.id === id) || STAGES[0];
}
