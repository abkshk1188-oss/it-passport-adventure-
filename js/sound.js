// ITパスポート冒険記 - BGM / 効果音
// 音声ファイルは持たず、Web Audio API で合成する。
// これによりオフラインでも鳴り、アプリの容量も増えない。
const Sound = (() => {
  let ctx = null;
  let master = null, bgmBus = null, seBus = null;
  let bgmTimer = null;
  let bgmTrack = null;
  let bgmStep = 0;
  let nextStepTime = 0;
  let unlocked = false;

  // app.js から設定を差し込む
  let settings = { bgm: true, se: true };

  function setSettings(next) {
    const wasBgm = settings.bgm;
    settings = Object.assign({}, settings, next || {});
    if (bgmBus) bgmBus.gain.value = settings.bgm ? 0.14 : 0;
    if (seBus) seBus.gain.value = settings.se ? 0.5 : 0;
    // BGMをオンに切り替えた直後は鳴り始めるようにする
    if (!wasBgm && settings.bgm && bgmTrack) startBgm(bgmTrack);
    if (wasBgm && !settings.bgm) stopBgmTimer();
  }

  function ensureCtx() {
    if (ctx) {
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    bgmBus = ctx.createGain();
    bgmBus.gain.value = settings.bgm ? 0.14 : 0;
    bgmBus.connect(master);
    seBus = ctx.createGain();
    seBus.gain.value = settings.se ? 0.5 : 0;
    seBus.connect(master);
    return ctx;
  }

  // ブラウザの自動再生制限があるため、最初のタップで初期化する
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    ensureCtx();
    if (settings.bgm && bgmTrack) startBgm(bgmTrack);
  }

  function midiToFreq(n) {
    return 440 * Math.pow(2, (n - 69) / 12);
  }

  // 単音を鳴らす。sweepTo を指定すると音程が滑る。
  function tone(opts) {
    if (!ctx || !settings.se) return;
    const o = Object.assign({
      freq: 440, dur: 0.12, type: "square", gain: 0.25, delay: 0, sweepTo: null, bus: seBus,
    }, opts);
    const t0 = ctx.currentTime + o.delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type;
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.sweepTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.sweepTo), t0 + o.dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(o.gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    osc.connect(g);
    g.connect(o.bus);
    osc.start(t0);
    osc.stop(t0 + o.dur + 0.02);
  }

  // ノイズ(打撃音・きらめき用)
  function noise(opts) {
    if (!ctx || !settings.se) return;
    const o = Object.assign({ dur: 0.12, gain: 0.12, delay: 0, hp: 800 }, opts);
    const t0 = ctx.currentTime + o.delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * o.dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = o.hp;
    const g = ctx.createGain();
    g.gain.setValueAtTime(o.gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(seBus);
    src.start(t0);
  }

  function arpeggio(notes, step, opts) {
    notes.forEach((n, i) => {
      tone(Object.assign({ freq: midiToFreq(n), delay: i * step }, opts));
    });
  }

  // ---------------- 効果音 ----------------
  const EFFECTS = {
    tap() { tone({ freq: 620, dur: 0.05, type: "triangle", gain: 0.12 }); },

    select() { tone({ freq: 880, dur: 0.06, type: "square", gain: 0.14 }); },

    correct() {
      arpeggio([76, 81, 88], 0.07, { dur: 0.16, type: "square", gain: 0.2 });
    },

    incorrect() {
      tone({ freq: 220, dur: 0.28, type: "sawtooth", gain: 0.18, sweepTo: 110 });
      noise({ dur: 0.12, gain: 0.06, hp: 400 });
    },

    combo(n) {
      // コンボが伸びるほど高い音になる
      const base = 81 + Math.min(12, (n - 2) * 2);
      arpeggio([base, base + 4, base + 7], 0.05, { dur: 0.12, type: "square", gain: 0.16 });
    },

    coin() {
      arpeggio([88, 95], 0.05, { dur: 0.14, type: "square", gain: 0.16 });
    },

    levelup() {
      arpeggio([72, 76, 79, 84, 88], 0.09, { dur: 0.3, type: "square", gain: 0.2 });
      noise({ dur: 0.4, gain: 0.05, hp: 2500, delay: 0.36 });
    },

    chest() {
      noise({ dur: 0.18, gain: 0.1, hp: 300 });
      arpeggio([69, 74, 78, 81], 0.08, { dur: 0.26, type: "triangle", gain: 0.2, delay: 0.1 });
    },

    fail() {
      arpeggio([64, 61, 57], 0.14, { dur: 0.3, type: "triangle", gain: 0.18 });
    },

    // ガチャの引き始め(ための音)
    gachaCharge() {
      tone({ freq: 160, dur: 1.0, type: "sawtooth", gain: 0.1, sweepTo: 900 });
      noise({ dur: 0.9, gain: 0.05, hp: 1200, delay: 0.1 });
    },

    // 高レア確定の予兆音
    gachaOmen() {
      tone({ freq: 1200, dur: 0.5, type: "sine", gain: 0.18, sweepTo: 2400 });
      noise({ dur: 0.5, gain: 0.08, hp: 3000 });
    },

    // レアリティ別の当たり音
    reveal(rarity) {
      if (rarity >= 6) {
        // ★6: 荘厳なファンファーレ
        arpeggio([60, 67, 72, 76, 79, 84], 0.11, { dur: 0.5, type: "triangle", gain: 0.22 });
        arpeggio([48, 55, 60], 0.11, { dur: 1.2, type: "sine", gain: 0.16 });
        noise({ dur: 1.0, gain: 0.06, hp: 3000, delay: 0.6 });
      } else if (rarity === 5) {
        // ★5: 華やかなファンファーレ
        arpeggio([72, 76, 79, 84, 91], 0.09, { dur: 0.42, type: "square", gain: 0.22 });
        noise({ dur: 0.7, gain: 0.06, hp: 2800, delay: 0.4 });
      } else if (rarity === 4) {
        // ★4: 明るい和音
        arpeggio([69, 73, 76, 81], 0.07, { dur: 0.32, type: "square", gain: 0.2 });
        noise({ dur: 0.4, gain: 0.05, hp: 2500, delay: 0.28 });
      } else if (rarity === 3) {
        arpeggio([69, 74, 78], 0.07, { dur: 0.22, type: "square", gain: 0.18 });
      } else if (rarity === 2) {
        arpeggio([69, 76], 0.06, { dur: 0.16, type: "square", gain: 0.16 });
      } else {
        tone({ freq: midiToFreq(69), dur: 0.12, type: "triangle", gain: 0.14 });
      }
    },

    complete() {
      // 図鑑コンプリート
      arpeggio([60, 64, 67, 72, 76, 79, 84], 0.12, { dur: 0.6, type: "triangle", gain: 0.22 });
      arpeggio([48, 60], 0.0, { dur: 1.6, type: "sine", gain: 0.14 });
      noise({ dur: 1.2, gain: 0.06, hp: 3000, delay: 0.8 });
    },
  };

  function play(name, arg) {
    if (!settings.se) return;
    ensureCtx();
    if (!ctx) return;
    const fn = EFFECTS[name];
    if (fn) fn(arg);
  }

  // ---------------- BGM ----------------
  // 短いコード進行をアルペジオで回す簡素なチップチューン。
  const TRACKS = {
    map: {
      tempo: 100,
      prog: [
        { root: 45, chord: [0, 3, 7, 12] },  // Am
        { root: 41, chord: [0, 4, 7, 12] },  // F
        { root: 48, chord: [0, 4, 7, 12] },  // C
        { root: 43, chord: [0, 4, 7, 12] },  // G
      ],
      leadType: "triangle",
      bassType: "sine",
      leadGain: 0.18,
      bassGain: 0.22,
    },
    battle: {
      tempo: 132,
      prog: [
        { root: 45, chord: [0, 3, 7, 10] },
        { root: 43, chord: [0, 3, 7, 10] },
        { root: 41, chord: [0, 4, 7, 11] },
        { root: 40, chord: [0, 4, 7, 10] },
      ],
      leadType: "square",
      bassType: "sawtooth",
      leadGain: 0.15,
      bassGain: 0.18,
    },
    boss: {
      tempo: 148,
      prog: [
        { root: 40, chord: [0, 3, 6, 10] },  // 減和音での緊張感
        { root: 40, chord: [0, 3, 7, 10] },
        { root: 38, chord: [0, 3, 6, 10] },
        { root: 43, chord: [0, 3, 7, 11] },
      ],
      leadType: "square",
      bassType: "sawtooth",
      leadGain: 0.15,
      bassGain: 0.2,
    },
  };

  const ARP = [0, 1, 2, 3, 2, 1, 2, 3]; // 1小節(8分音符×8)のアルペジオ順
  const STEPS_PER_BAR = 8;

  function bgmTone(freq, dur, type, gain, when) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(gain, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g);
    g.connect(bgmBus);
    osc.start(when);
    osc.stop(when + dur + 0.02);
  }

  function playStep(track, stepIndex, when) {
    const bar = Math.floor(stepIndex / STEPS_PER_BAR) % track.prog.length;
    const inBar = stepIndex % STEPS_PER_BAR;
    const p = track.prog[bar];
    const stepDur = 60 / track.tempo / 2;

    // アルペジオ
    const interval = p.chord[ARP[inBar] % p.chord.length];
    bgmTone(midiToFreq(p.root + 24 + interval), stepDur * 1.6, track.leadType, track.leadGain, when);

    // ベース(小節の頭と5拍目)
    if (inBar === 0 || inBar === 4) {
      bgmTone(midiToFreq(p.root), stepDur * 1.8, track.bassType, track.bassGain, when);
    }
  }

  function scheduler() {
    if (!ctx || !bgmTrack) return;
    const track = TRACKS[bgmTrack];
    if (!track) return;
    const stepDur = 60 / track.tempo / 2;
    const totalSteps = STEPS_PER_BAR * track.prog.length;
    while (nextStepTime < ctx.currentTime + 0.25) {
      playStep(track, bgmStep, Math.max(nextStepTime, ctx.currentTime + 0.02));
      nextStepTime += stepDur;
      bgmStep = (bgmStep + 1) % totalSteps;
    }
  }

  function stopBgmTimer() {
    if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; }
  }

  // 同じ曲なら鳴らし続け、違う曲なら切り替える
  function startBgm(name) {
    if (!TRACKS[name]) return;
    const changing = bgmTrack !== name;
    bgmTrack = name;
    if (!settings.bgm) return;
    ensureCtx();
    if (!ctx) return;
    if (!changing && bgmTimer) return;
    stopBgmTimer();
    if (changing) { bgmStep = 0; }
    nextStepTime = ctx.currentTime + 0.05;
    bgmTimer = setInterval(scheduler, 60);
    scheduler();
  }

  function stopBgm() {
    bgmTrack = null;
    stopBgmTimer();
  }

  return { play, startBgm, stopBgm, setSettings, unlock, isUnlocked: () => unlocked };
})();
