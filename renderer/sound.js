// 오르골 사운드 (WebAudio 합성, 외부 파일 없음)
const Sound = (() => {
  let ac = null, master = null, wet = null;
  let sfxOn = true, bgmOn = false;
  let bgmBus = null, bgmTimer = null, songIdx = 0;

  const SEMI = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
  function freq(name) {
    const m = /^([A-G])(#?)(\d)$/.exec(name);
    if (!m) return 0;
    const semi = SEMI[m[1]] + (m[2] ? 1 : 0) + (parseInt(m[3], 10) - 4) * 12;
    return 440 * Math.pow(2, semi / 12);
  }

  function init() {
    if (ac) return true;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
    } catch (_) { return false; }
    master = ac.createGain();
    master.gain.value = 0.32;
    master.connect(ac.destination);
    // 간단한 리버브
    const len = Math.floor(ac.sampleRate * 1.8);
    const buf = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    const conv = ac.createConvolver();
    conv.buffer = buf;
    wet = ac.createGain();
    wet.gain.value = 0.35;
    conv.connect(wet);
    wet.connect(master);
    master._conv = conv;
    return true;
  }

  function note(name, t0, dur, vol, dest) {
    const f = typeof name === 'number' ? name : freq(name);
    if (!f) return;
    const g = ac.createGain();
    const o1 = ac.createOscillator();
    const o2 = ac.createOscillator();
    const g2 = ac.createGain();
    o1.type = 'sine'; o1.frequency.value = f;
    o2.type = 'sine'; o2.frequency.value = f * 4.02; // 오르골의 맑은 배음
    g2.gain.value = 0.18;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o1.connect(g); o2.connect(g2); g2.connect(g);
    g.connect(dest || master);
    g.connect(master._conv);
    o1.start(t0); o2.start(t0);
    o1.stop(t0 + dur + 0.05); o2.stop(t0 + dur + 0.05);
  }

  // [음, 박] 목록
  const SONGS = [
    { // 고요한 밤 (6/8)
      beat: 0.30,
      seq: 'G4:3 A4:1 G4:2 E4:6 G4:3 A4:1 G4:2 E4:6 D5:4 D5:2 B4:6 C5:4 C5:2 G4:6 ' +
           'A4:4 A4:2 C5:3 B4:1 A4:2 G4:3 A4:1 G4:2 E4:6 A4:4 A4:2 C5:3 B4:1 A4:2 ' +
           'G4:3 A4:1 G4:2 E4:6 D5:4 D5:2 F5:3 D5:1 B4:2 C5:6 E5:6 C5:2 G4:2 E4:2 G4:3 F4:1 D4:2 C4:6',
    },
    { // 징글벨
      beat: 0.34,
      seq: 'E4:1 E4:1 E4:2 E4:1 E4:1 E4:2 E4:1 G4:1 C4:1.5 D4:.5 E4:4 ' +
           'F4:1 F4:1 F4:1.5 F4:.5 F4:1 E4:1 E4:1 E4:.5 E4:.5 E4:1 D4:1 D4:1 E4:1 D4:2 G4:2',
    },
    { // 위 위시 유 어 메리 크리스마스
      beat: 0.36,
      seq: 'D4:1 G4:1 G4:.5 A4:.5 G4:.5 F#4:.5 E4:1 E4:1 E4:1 A4:1 A4:.5 B4:.5 A4:.5 G4:.5 ' +
           'F#4:1 D4:1 D4:1 B4:1 B4:.5 C5:.5 B4:.5 A4:.5 G4:1 E4:1 D4:.5 D4:.5 E4:1 A4:1 F#4:1 G4:3',
    },
  ];

  function playSong(song, dest) {
    let t = ac.currentTime + 0.2;
    for (const tok of song.seq.split(' ')) {
      const [n, b] = tok.split(':');
      const beats = parseFloat(b);
      note(n, t, Math.max(1.2, beats * song.beat * 1.8), 0.22, dest);
      t += beats * song.beat;
    }
    return t - ac.currentTime;
  }

  function startBgm() {
    if (!init()) return;
    stopBgm(true);
    ac.resume();
    bgmBus = ac.createGain();
    bgmBus.gain.value = 0.8;
    bgmBus.connect(master);
    const next = () => {
      const song = SONGS[songIdx % SONGS.length];
      songIdx++;
      const total = playSong(song, bgmBus);
      bgmTimer = setTimeout(next, (total + 6) * 1000);
    };
    next();
  }
  function stopBgm(quick) {
    clearTimeout(bgmTimer); bgmTimer = null;
    if (bgmBus) {
      const bus = bgmBus; bgmBus = null;
      bus.gain.setTargetAtTime(0, ac.currentTime, quick ? 0.01 : 0.25);
      setTimeout(() => { try { bus.disconnect(); } catch (_) { /* */ } }, 1500);
    }
  }

  function sfx(fn) {
    if (!sfxOn || !init()) return;
    ac.resume();
    fn(ac.currentTime);
  }

  const PENTA = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'E6'];

  return {
    configure(s) {
      sfxOn = !!s.sound;
      if (s.bgm && !bgmOn) { bgmOn = true; startBgm(); }
      else if (!s.bgm && bgmOn) { bgmOn = false; stopBgm(); }
    },
    tap() { sfx((t) => note(PENTA[Math.floor(Math.random() * PENTA.length)], t, 1.4, 0.25)); },
    shake() { sfx((t) => { note('E6', t, 0.25, 0.1); note('G6', t + 0.07, 0.25, 0.1); note('E6', t + 0.14, 0.25, 0.1); }); },
    open() { sfx((t) => { ['C5', 'E5', 'G5', 'C6', 'E6', 'G6'].forEach((n, i) => note(n, t + i * 0.085, 1.8, 0.24)); }); },
    arrive() { sfx((t) => { note('G5', t, 1.2, 0.2); note('C6', t + 0.1, 1.6, 0.22); }); },
    spawn() { sfx((t) => { note('A5', t, 1.4, 0.2); note('E6', t + 0.12, 1.6, 0.18); }); },
    bell() { sfx((t) => { note(2093 + Math.random() * 300, t, 0.6, 0.07); }); },
    wish() { sfx((t) => { ['E5', 'G5', 'B5', 'E6'].forEach((n, i) => note(n, t + i * 0.12, 2, 0.2)); }); },
    greet() { sfx((t) => { ['C5', 'G5', 'E6'].forEach((n, i) => note(n, t + i * 0.16, 2.2, 0.2)); }); },
  };
})();
