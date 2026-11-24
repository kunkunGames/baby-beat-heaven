// Automated Chart Integrity & Timing Verifier (TEST-001)
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = dirname(fileURLToPath(import.meta.url));
const chartsCode = readFileSync(resolve(ROOT, "../src/charts.js"), "utf8");
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(chartsCode + "\nthis.__STAGES = STAGES;", sandbox);

const stages = sandbox.__STAGES;
if (!Array.isArray(stages) || stages.length !== 5) {
  throw new Error(`Expected 5 stages, found ${stages?.length}`);
}

let totalEvents = 0;
for (const st of stages) {
  const ch = st.buildChart();
  if (!ch.events.length) throw new Error(`${st.id}: empty events`);
  if (ch.totalBeats <= 0) throw new Error(`${st.id}: invalid totalBeats`);

  let prevBeat = -1;
  let skillStars = 0;
  let openHold = null;

  for (const ev of ch.events) {
    if (ev.beat <= prevBeat) {
      throw new Error(`${st.id}: non-monotonic beat ${ev.beat} after ${prevBeat} (${ev.id})`);
    }
    if (ev.beat >= ch.totalBeats) {
      throw new Error(`${st.id}: event ${ev.id} at beat ${ev.beat} >= totalBeats ${ch.totalBeats}`);
    }
    if (ev.cueBeat >= ev.beat) {
      throw new Error(`${st.id}: event ${ev.id} cueBeat ${ev.cueBeat} >= beat ${ev.beat}`);
    }
    if (ev.skillStar) skillStars++;
    if (ev.type === "hold") {
      if (openHold) throw new Error(`${st.id}: overlapping hold ${ev.id}`);
      openHold = ev;
    } else if (ev.type === "release") {
      if (!openHold) throw new Error(`${st.id}: orphan release ${ev.id}`);
      openHold = null;
    }
    prevBeat = ev.beat;
  }

  if (openHold) throw new Error(`${st.id}: unclosed hold ${openHold.id}`);
  if (skillStars !== 1) throw new Error(`${st.id}: expected exactly 1 Skill Star, got ${skillStars}`);
  if (st.isRemix) {
    const subs = new Set(ch.events.map((e) => e.subStage));
    if (subs.size !== 4) throw new Error(`remix: expected all 4 subStages, got ${[...subs].join(",")}`);
  }
  totalEvents += ch.events.length;
  console.log(`PASS ${st.id.padEnd(10)} | ${st.bpm} BPM | ${ch.totalBeats} beats | ${ch.events.length} events | ${ch.cues.length} cues | 1 Skill Star`);
}

console.log(`\nALL 5 STAGE CHARTS VERIFIED (${totalEvents} total judged events).`);
