(() => {
  'use strict';
  const W = 300, H = 400, CX = 150;
  const PI = Math.PI;
  const cv = document.getElementById('c');
  const ctx = cv.getContext('2d');
  const stage = document.getElementById('stage');
  const bubbleEl = document.getElementById('bubble');
  const wishEl = document.getElementById('wish');
  const wishInput = document.getElementById('wishText');

  let K = 1, DPR = 1;
  function resize() {
    K = window.innerWidth / W;
    DPR = window.devicePixelRatio || 1;
    stage.style.transform = `scale(${K})`;
    cv.width = Math.round(W * K * DPR);
    cv.height = Math.round(H * K * DPR);
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------- 유틸 ----------
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const T = () => performance.now() / 1000;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeOutQuad = (u) => 1 - (1 - u) * (1 - u);
  const easeOutBounce = (u) => {
    const n = 7.5625, d = 2.75;
    if (u < 1 / d) return n * u * u;
    if (u < 2 / d) return n * (u -= 1.5 / d) * u + 0.75;
    if (u < 2.5 / d) return n * (u -= 2.25 / d) * u + 0.9375;
    return n * (u -= 2.625 / d) * u + 0.984375;
  };

  // ---------- 상태 ----------
  const KEY = 'xmas.v1';
  let S = { sound: true, bgm: false, fast: false };
  let st = loadState();
  function loadState() {
    try {
      const j = JSON.parse(localStorage.getItem(KEY));
      if (j && j.v === 1) return j;
    } catch (_) { /* ignore */ }
    return { v: 1, gifts: [], orns: [], nextGiftAt: 0, opened: 0, uid: 1, greetedDay: '', intro: false };
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        v: 1, nextGiftAt: st.nextGiftAt, opened: st.opened, uid: st.uid, greetedDay: st.greetedDay, intro: st.intro,
        gifts: st.gifts.map((g) => ({ id: g.id, slot: g.slot, color: g.color })),
        orns: st.orns.map((o) => ({ id: o.id, type: o.type, slot: o.slot, text: o.text, hue: o.hue })),
      }));
    } catch (_) { /* ignore */ }
  }
  const rtInit = (g) => { g.rt = { born: -100, state: 'idle', seed: Math.random() * 5, fromX: 0, fromY: 0 }; };
  st.gifts.forEach(rtInit);

  // ---------- 지오메트리 ----------
  const TIERS = [
    { ay: 82, by: 170, hw: 52 },
    { ay: 125, by: 240, hw: 78 },
    { ay: 185, by: 315, hw: 105 },
  ];
  const GIFT_SLOTS = [
    { x: 58, y: 346 }, { x: 96, y: 354 }, { x: 204, y: 354 },
    { x: 242, y: 346 }, { x: 128, y: 358 }, { x: 172, y: 358 },
  ];
  const ORN_SLOTS = [
    [132, 128], [168, 146], [150, 160], [112, 190], [150, 205], [188, 196], [128, 226], [172, 232],
    [88, 260], [126, 272], [150, 255], [176, 276], [212, 262], [68, 296], [104, 300], [196, 300], [232, 292],
  ];
  const STAR = { x: CX, y: 64 };
  const GIFT_COLORS = [
    { box: '#d94b4b', rib: '#ffd36e' }, { box: '#3f8fd6', rib: '#ffffff' }, { box: '#3fa86b', rib: '#ff8f8f' },
    { box: '#a76bd6', rib: '#ffe28a' }, { box: '#f19a3e', rib: '#ffffff' }, { box: '#e86aa5', rib: '#fff2a8' },
  ];
  const ITEMS = [
    { t: 'ball', name: '반짝이 구슬' }, { t: 'star', name: '금빛 별' }, { t: 'bell', name: '작은 방울' },
    { t: 'cane', name: '지팡이 사탕' }, { t: 'heart', name: '빨간 하트' }, { t: 'sock', name: '빨간 양말' },
    { t: 'snowman', name: '꼬마 눈사람' }, { t: 'ginger', name: '진저브레드 쿠키' },
  ];
  const ITEM_NAME = Object.fromEntries(ITEMS.map((i) => [i.t, i.name]));
  ITEM_NAME.wish = '소원 별';

  // ---------- 스프라이트 ----------
  function makeSprite(size, draw) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    draw(c.getContext('2d'), size);
    return c;
  }
  const glowSprites = {};
  function glow(color) {
    if (!glowSprites[color]) {
      glowSprites[color] = makeSprite(48, (g, s) => {
        const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        r.addColorStop(0, color); r.addColorStop(0.25, color + 'aa'); r.addColorStop(1, color + '00');
        g.fillStyle = r; g.fillRect(0, 0, s, s);
      });
    }
    return glowSprites[color];
  }
  const sparkSprite = makeSprite(32, (g, s) => {
    const c = s / 2;
    const r = g.createRadialGradient(c, c, 0, c, c, c);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.2, 'rgba(255,240,190,.55)'); r.addColorStop(1, 'rgba(255,220,140,0)');
    g.fillStyle = r; g.fillRect(0, 0, s, s);
    g.fillStyle = '#fff';
    g.beginPath();
    g.moveTo(c, 1); g.quadraticCurveTo(c, c, s - 1, c); g.quadraticCurveTo(c, c, c, s - 1);
    g.quadraticCurveTo(c, c, 1, c); g.quadraticCurveTo(c, c, c, 1); g.fill();
  });
  const flakeSprite = makeSprite(24, (g, s) => {
    const c = s / 2;
    const r = g.createRadialGradient(c, c, 0, c, c, c);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.42, 'rgba(255,255,255,.95)');
    r.addColorStop(0.7, 'rgba(150,185,235,.55)'); r.addColorStop(1, 'rgba(150,185,235,0)');
    g.fillStyle = r; g.fillRect(0, 0, s, s);
  });

  // ---------- 조명 ----------
  const BULB_COLORS = ['#ffd27a', '#ff6b6b', '#7ad7ff', '#9dff9d', '#ff9de6'];
  const bulbs = [];
  TIERS.forEach((t, ti) => {
    const fr = ti === 0 ? [0.72] : [0.58, 0.87];
    fr.forEach((f, si) => {
      const yy = t.ay + (t.by - t.ay) * f;
      const w = t.hw * (yy - t.ay) / (t.by - t.ay) * 0.8;
      const n = Math.max(3, Math.round(w / 13));
      const wire = [];
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1);
        const x = CX - w + u * 2 * w;
        const y = yy + 7 * (1 - Math.pow(2 * u - 1, 2)) + (si ? 2 : 0);
        bulbs.push({ x, y, c: BULB_COLORS[(i + ti + si) % BULB_COLORS.length], ph: rand(0, 6.28), sp: rand(1.6, 3.4) });
      }
      for (let i = 0; i <= 12; i++) {
        const u = i / 12;
        wire.push([CX - w + u * 2 * w, yy + 7 * (1 - Math.pow(2 * u - 1, 2)) + (si ? 2 : 0)]);
      }
      bulbs.push({ wire });
    });
  });

  // ---------- 하늘/시간대 ----------
  let dayAmt = 0, lateNight = false;
  function updateTimeOfDay() {
    const d = new Date();
    const h = d.getHours() + d.getMinutes() / 60;
    dayAmt = (h >= 6 && h <= 18) ? Math.sin(PI * (h - 6) / 12) : 0;
    lateNight = h >= 23 || h < 5;
  }
  updateTimeOfDay();

  function ddayInfo() {
    const n = new Date();
    const today = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    let x = new Date(n.getFullYear(), 11, 25);
    if (x < today) x = new Date(n.getFullYear() + 1, 11, 25);
    const diff = Math.round((x - today) / 86400000);
    return { diff, text: diff === 0 ? '🎄 메리 크리스마스' : `D-${diff}`, isEve: n.getMonth() === 11 && (n.getDate() === 24 || n.getDate() === 25) };
  }

  // ---------- 눈 ----------
  const flakes = [];
  for (let i = 0; i < 70; i++) {
    const r = rand(0.9, 3.0);
    flakes.push({ x: rand(0, W), y: rand(0, H), r, vy: 10 + r * 9 + rand(0, 8), ph: rand(0, 6.28), amp: rand(4, 14), front: r > 1.9 });
  }
  let wind = 0;

  // ---------- 파티클 ----------
  const parts = [];
  const SPARK_COLORS = ['#fff6c8', '#ffd86e', '#ffb3d9', '#bfe6ff', '#ffffff'];
  const CONF_COLORS = ['#ff5d5d', '#ffd24d', '#5dc9ff', '#7be07b', '#ff8fd0', '#ffffff'];
  function burst(x, y, n, kind) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, PI * 2), sp = kind === 'confetti' ? rand(50, 170) : rand(25, 100);
      parts.push({
        kind, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (kind === 'confetti' ? 70 : 20),
        life: 0, max: rand(0.7, 1.5), size: rand(0.5, 1) , rot: rand(0, 6.28), vr: rand(-8, 8),
        color: kind === 'confetti' ? pick(CONF_COLORS) : pick(SPARK_COLORS),
      });
    }
  }
  function twinkleAt(x, y) {
    parts.push({ kind: 'spark', x, y, vx: rand(-3, 3), vy: rand(-6, 0), life: 0, max: rand(0.8, 1.4), size: rand(0.5, 0.9), rot: 0, vr: 0, color: '#fff6c8', still: true });
  }

  // ---------- 효과 상태 ----------
  let wob = 0, wobV = 0, flash = 0;
  const flights = [];      // 장식이 트리로 날아가는 연출
  const opening = [];      // 열리는 중인 선물
  const sl = { active: false, x: 0, dir: 1, dropped: false, nextAt: 0, bellAt: 0, trailAt: 0 };

  // ---------- 메시지 ----------
  const MSGS = [
    '오늘도 여기까지 오느라 정말 수고했어요.', '잠깐 숨 돌려요. 따뜻한 차 한 잔 어때요?',
    '당신이 있어서 누군가의 오늘이 조금 더 따뜻해요.', '눈 내리는 소리, 들리나요? 세상이 잠깐 조용해졌어요.',
    '올해 가장 잘한 일은 포기하지 않은 거예요.', '작은 불빛 하나가 어두운 밤을 다 밝히곤 해요.',
    '오늘의 소원: 푹 자고, 맛있게 먹고, 많이 웃기.', '좋은 일은 늘 예상하지 못한 순간에 찾아와요.',
    '서두르지 않아도 괜찮아요. 트리도 천천히 반짝이니까요.', '연말엔 보고 싶은 사람에게 안부 한 줄 어때요?',
    '당신의 올해 이야기에 박수를 보내요. 짝짝짝.', '오늘 하루, 스스로에게 다정했나요?',
    '산타는 착한 사람이 아니라 애쓴 사람을 찾아온대요.', '마음이 시끄러운 날엔 불빛만 가만히 바라봐요.',
    '내년의 당신에게도 좋은 일이 가득할 거예요.', '따뜻한 이불, 따뜻한 음악, 따뜻한 사람. 그거면 충분해요.',
    '눈송이는 모두 다르게 생겼대요. 당신처럼요.', '지금 이 순간도 나중엔 그리운 겨울이 될 거예요.',
    '괜찮아요, 못 한 일보다 해낸 일이 훨씬 많아요.', '메리 크리스마스! 오늘도 당신 편이에요.',
    '물 한 잔 마시고 어깨 한 번 돌려봐요.', '잠깐 창밖을 봐요. 하늘이 생각보다 예뻐요.',
    '당신의 오늘이 트리처럼 반짝였으면 좋겠어요.', '받은 마음은 돌려주지 않아도 돼요. 그냥 간직해요.',
  ];
  const NIGHT_MSGS = ['늦은 시간이네요. 오늘은 이만 쉬어도 좋아요.', '밤이 깊었어요. 눈을 감으면 오르골 소리가 들릴 거예요.', '잠들기 전, 오늘 좋았던 일 하나만 떠올려봐요.'];
  const MORNING_MSGS = ['좋은 아침이에요. 오늘도 천천히 시작해요.', '아침 햇살에도 트리는 반짝여요. 오늘 하루도 응원해요.', '따뜻한 아침 한 모금으로 시작해볼까요?'];
  function pickMessage() {
    const h = new Date().getHours();
    if (Math.random() < 0.35) {
      if (h >= 23 || h < 5) return pick(NIGHT_MSGS);
      if (h >= 5 && h < 10) return pick(MORNING_MSGS);
    }
    const wishes = st.orns.filter((o) => o.type === 'wish' && o.text);
    if (wishes.length && Math.random() < 0.18) return `“${pick(wishes).text}” 이 소원, 산타가 듣고 있대요.`;
    return pick(MSGS);
  }

  // ---------- 말풍선 ----------
  let bubbleTimer = null, bubbleVisible = false;
  function showBubble(title, msg, ms) {
    bubbleEl.querySelector('.t').textContent = title;
    bubbleEl.querySelector('.m').textContent = msg;
    bubbleEl.classList.add('show');
    bubbleVisible = true;
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(hideBubble, ms || clamp(3500 + msg.length * 140, 5000, 12000));
  }
  function hideBubble() {
    bubbleEl.classList.remove('show');
    bubbleVisible = false;
    clearTimeout(bubbleTimer);
  }
  function bubbleRect() {
    const r = bubbleEl.getBoundingClientRect();
    return { x: r.left / K, y: r.top / K, w: r.width / K, h: r.height / K };
  }

  // ---------- 선물 ----------
  const giftInterval = () => {
    let base = S.fast ? 15000 : 2 * 60000;
    if (ddayInfo().isEve) base *= 0.5;
    return base * rand(0.8, 1.2);
  };
  function freeSlots() {
    const used = new Set(st.gifts.map((g) => g.slot).concat(opening.map((g) => g.slot)));
    return GIFT_SLOTS.map((_, i) => i).filter((i) => !used.has(i));
  }
  function spawnGift(from) {
    const free = freeSlots();
    if (!free.length) return null;
    const slot = pick(free);
    const g = { id: st.uid++, slot, color: Math.floor(rand(0, GIFT_COLORS.length)) };
    rtInit(g);
    g.rt.state = 'fall';
    g.rt.born = T();
    g.rt.fromX = from ? from.x : GIFT_SLOTS[slot].x + rand(-10, 10);
    g.rt.fromY = from ? from.y : -30;
    st.gifts.push(g);
    save();
    Sound.spawn();
    return g;
  }
  function giftPose(g) {
    const s = GIFT_SLOTS[g.slot], rt = g.rt, now = T();
    const p = { x: s.x, y: s.y, rot: 0, scale: 1 };
    if (rt.state === 'fall') {
      const u = (now - rt.born) / 0.95;
      if (u >= 1) {
        rt.state = 'idle';
        burst(s.x, s.y - 10, 6, 'spark');
      } else {
        p.x = rt.fromX + (s.x - rt.fromX) * easeOutQuad(u);
        p.y = rt.fromY + (s.y - rt.fromY) * easeOutBounce(u);
        p.rot = (1 - u) * 0.5;
        return p;
      }
    }
    const ph = (now + rt.seed) % 5.5;
    if (ph < 0.55) p.rot = Math.sin(ph * 38) * 0.13 * (1 - ph / 0.55);
    p.y += Math.sin(now * 2 + rt.seed) * 0.6;
    if (hover && hover.k === 'gift' && hover.g === g) p.scale = 1.13;
    return p;
  }
  function openGift(g) {
    const i = st.gifts.indexOf(g);
    if (i < 0 || g.rt.state === 'fall') return;
    st.gifts.splice(i, 1);
    g.rt.state = 'opening';
    g.rt.openAt = T();
    g.rt.burst = false;
    g.rt.item = pick(ITEMS).t;
    g.rt.msg = pickMessage();
    opening.push(g);
    st.opened++;
    Sound.shake();
    const orn = addOrnament(g.rt.item);
    orn.pending = true;
    g.rt.orn = orn;
    save();
  }
  function addOrnament(type, text) {
    const used = new Set(st.orns.map((o) => o.slot));
    let free = ORN_SLOTS.map((_, i) => i).filter((i) => !used.has(i));
    if (!free.length) {
      let victim = st.orns.find((o) => o.type !== 'wish') || st.orns[0];
      st.orns.splice(st.orns.indexOf(victim), 1);
      free = [victim.slot];
    }
    const o = { id: st.uid++, type, slot: pick(free), text: text || '', hue: Math.floor(rand(0, 360)) };
    st.orns.push(o);
    save();
    return o;
  }

  // ---------- 썰매 ----------
  function startSleigh() {
    sl.active = true;
    sl.dir = Math.random() < 0.5 ? 1 : -1;
    sl.x = sl.dir > 0 ? -110 : W + 110;
    sl.dropped = false;
    sl.bellAt = 0; sl.trailAt = 0;
  }
  function scheduleSleigh(first) {
    sl.nextAt = T() + (S.fast ? 20 : (first ? rand(70, 140) : rand(240, 540)));
  }
  function sleighY() { return 34 + Math.sin(T() * 2.2) * 5; }

  // ---------- 그리기: 장식 ----------
  function drawOrn(type, hue, x, y, scale, ang) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang || 0);
    ctx.scale(scale, scale);
    ctx.lineCap = 'round';
    const hookLine = () => {
      ctx.strokeStyle = 'rgba(255,225,150,.9)'; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(0, 1); ctx.stroke();
    };
    switch (type) {
      case 'ball': {
        hookLine();
        const g = ctx.createRadialGradient(-1.8, 3, 0.5, 0, 6, 6);
        g.addColorStop(0, `hsl(${hue},85%,80%)`); g.addColorStop(1, `hsl(${hue},70%,45%)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 6, 5.2, 0, PI * 2); ctx.fill();
        ctx.fillStyle = '#e8c35a'; ctx.fillRect(-1.6, 0.4, 3.2, 1.6);
        break;
      }
      case 'star': {
        hookLine();
        ctx.fillStyle = '#ffd24a'; starPath(0, 7, 6.8, 3); ctx.fill();
        ctx.strokeStyle = '#d9972a'; ctx.lineWidth = 0.6; ctx.stroke();
        break;
      }
      case 'bell': {
        hookLine();
        ctx.fillStyle = '#f0c046';
        ctx.beginPath(); ctx.moveTo(-1.8, 1.5); ctx.quadraticCurveTo(-5.6, 5, -5.8, 9); ctx.lineTo(5.8, 9);
        ctx.quadraticCurveTo(5.6, 5, 1.8, 1.5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#b5811c'; ctx.beginPath(); ctx.arc(0, 10, 1.4, 0, PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(-3.2, 4.2, 1.2, 3.4);
        break;
      }
      case 'cane': {
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#fff';
        ctx.beginPath(); ctx.moveTo(2.8, 13); ctx.lineTo(2.8, 3.5); ctx.arc(0, 3.5, 2.8, 0, PI, true); ctx.stroke();
        ctx.strokeStyle = '#d93a3a'; ctx.setLineDash([2, 2]);
        ctx.beginPath(); ctx.moveTo(2.8, 13); ctx.lineTo(2.8, 3.5); ctx.arc(0, 3.5, 2.8, 0, PI, true); ctx.stroke();
        ctx.setLineDash([]);
        break;
      }
      case 'heart': {
        hookLine();
        ctx.fillStyle = '#e8454f';
        ctx.beginPath(); ctx.moveTo(0, 12); ctx.bezierCurveTo(-8, 6, -5, 0, 0, 3.6); ctx.bezierCurveTo(5, 0, 8, 6, 0, 12); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(-2.6, 5, 1.1, 0, PI * 2); ctx.fill();
        break;
      }
      case 'sock': {
        ctx.fillStyle = '#d7383f';
        ctx.fillRect(-3, 1.5, 6, 8);
        ctx.beginPath(); ctx.ellipse(1.8, 10.2, 5, 3.3, 0, 0, PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillRect(-3.6, 0, 7.2, 2.8);
        ctx.beginPath(); ctx.ellipse(5.4, 10.6, 1.8, 1.8, 0, 0, PI * 2); ctx.fill();
        break;
      }
      case 'snowman': {
        hookLine();
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#9db6d8'; ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.arc(0, 10, 4.4, 0, PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 4.6, 3.3, 0, PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#2b2b3a'; ctx.fillRect(-2.6, 0.6, 5.2, 1.6); ctx.fillRect(-1.7, -1.6, 3.4, 2.4);
        ctx.fillStyle = '#f08a2e'; ctx.beginPath(); ctx.moveTo(0, 4.6); ctx.lineTo(3.6, 5.2); ctx.lineTo(0, 5.8); ctx.fill();
        ctx.fillStyle = '#222'; ctx.fillRect(-1.5, 3.6, 0.8, 0.8); ctx.fillRect(0.8, 3.6, 0.8, 0.8);
        break;
      }
      case 'ginger': {
        hookLine();
        ctx.fillStyle = '#b9783a'; ctx.strokeStyle = '#b9783a'; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.arc(0, 4, 3, 0, PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, 9, 3.2, 3.8, 0, 0, PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-5.2, 8); ctx.lineTo(5.2, 8); ctx.moveTo(-2, 11); ctx.lineTo(-3, 14.5); ctx.moveTo(2, 11); ctx.lineTo(3, 14.5); ctx.stroke();
        ctx.fillStyle = '#fff';
        [[-1, 3.6], [1, 3.6], [0, 8.4], [0, 10.6]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(a, b, 0.55, 0, PI * 2); ctx.fill(); });
        break;
      }
      case 'wish': {
        ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(255,225,150,.9)';
        ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(0, 1); ctx.stroke();
        const g = ctx.createRadialGradient(0, 8, 0, 0, 8, 8);
        g.addColorStop(0, '#fffbe0'); g.addColorStop(1, '#ffc93d');
        ctx.fillStyle = g; starPath(0, 8, 8, 3.6); ctx.fill();
        ctx.strokeStyle = '#e0a02e'; ctx.lineWidth = 0.6; ctx.stroke();
        break;
      }
      default: break;
    }
    ctx.restore();
  }
  function starPath(cx, cy, r1, r2) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? r2 : r1, a = -PI / 2 + i * PI / 5;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  }

  // ---------- 그리기: 선물 ----------
  function drawGift(x, y, color, o) {
    o = o || {};
    const c = GIFT_COLORS[color];
    const w = 26, bh = 16, lh = 7;
    ctx.save();
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.translate(x, y);
    ctx.rotate(o.rot || 0);
    const sc = o.scale || 1;
    ctx.scale(sc, sc);
    // 그림자
    ctx.fillStyle = 'rgba(60,80,120,.25)';
    ctx.beginPath(); ctx.ellipse(0, 1, w * 0.52, 3, 0, 0, PI * 2); ctx.fill();
    // 몸통
    ctx.fillStyle = c.box;
    ctx.beginPath(); ctx.roundRect(-w / 2, -bh, w, bh, 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.fillRect(w * 0.18, -bh, w * 0.32, bh);
    ctx.fillStyle = c.rib; ctx.fillRect(-2.6, -bh, 5.2, bh);
    // 뚜껑
    ctx.save();
    const lift = o.lift || 0;
    ctx.translate(0, -lift);
    ctx.rotate(-(o.lidRot || 0));
    ctx.fillStyle = c.box;
    ctx.beginPath(); ctx.roundRect(-w / 2 - 1.5, -bh - lh, w + 3, lh, 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.fillRect(w * 0.18, -bh - lh, w * 0.34, lh);
    ctx.fillStyle = c.rib; ctx.fillRect(-2.6, -bh - lh, 5.2, lh);
    // 리본 매듭
    ctx.beginPath(); ctx.ellipse(-4.6, -bh - lh - 2.4, 4.4, 2.8, -0.5, 0, PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4.6, -bh - lh - 2.4, 4.4, 2.8, 0.5, 0, PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.arc(0, -bh - lh - 1.6, 1.8, 0, PI * 2); ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  // ---------- 그리기: 썰매 ----------
  function drawSleigh(x, y, dir) {
    const t = T();
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // 고삐
    ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(14, 2); ctx.lineTo(34, -1); ctx.lineTo(54, -2); ctx.stroke();
    // 순록 두 마리
    [[34, 0], [58, -1]].forEach(([rx, ry], i) => {
      const g = Math.sin(t * 13 + i * 1.3);
      ctx.fillStyle = '#9c6b3d'; ctx.strokeStyle = '#7a4f28'; ctx.lineWidth = 1.5;
      // 다리
      ctx.beginPath();
      ctx.moveTo(rx - 6, ry + 4); ctx.lineTo(rx - 8 + g * 3, ry + 11);
      ctx.moveTo(rx - 3, ry + 4); ctx.lineTo(rx - 3 - g * 3, ry + 11);
      ctx.moveTo(rx + 4, ry + 4); ctx.lineTo(rx + 6 - g * 3, ry + 11);
      ctx.moveTo(rx + 7, ry + 3); ctx.lineTo(rx + 9 + g * 3, ry + 10);
      ctx.stroke();
      ctx.beginPath(); ctx.ellipse(rx, ry, 9, 4.6, 0, 0, PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(rx + 10, ry - 5, 3.4, 0, PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(rx + 7, ry - 2); ctx.lineTo(rx + 9, ry - 5); ctx.lineTo(rx + 11, ry - 5); ctx.fill();
      // 뿔
      ctx.strokeStyle = '#e9d6a4'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rx + 9.5, ry - 8); ctx.lineTo(rx + 7.5, ry - 13); ctx.moveTo(rx + 8.2, ry - 11); ctx.lineTo(rx + 5.6, ry - 12);
      ctx.moveTo(rx + 11, ry - 8); ctx.lineTo(rx + 12.6, ry - 13); ctx.moveTo(rx + 11.8, ry - 11); ctx.lineTo(rx + 14.6, ry - 12);
      ctx.stroke();
      // 코
      ctx.fillStyle = i === 1 ? '#ff4a4a' : '#3a2616';
      ctx.beginPath(); ctx.arc(rx + 13.2, ry - 4.4, 1.2, 0, PI * 2); ctx.fill();
      if (i === 1) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7; ctx.drawImage(glow('#ff3030'), rx + 6, ry - 11, 14, 14); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    });
    // 썰매 러너
    ctx.strokeStyle = '#d8b25a'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-24, 10); ctx.lineTo(16, 10); ctx.quadraticCurveTo(24, 10, 22, 3); ctx.stroke();
    ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-14, 9); ctx.lineTo(-14, 4); ctx.moveTo(8, 9); ctx.lineTo(8, 4); ctx.stroke();
    // 몸체
    ctx.fillStyle = '#c8372d';
    ctx.beginPath(); ctx.moveTo(-22, -4); ctx.lineTo(18, -4); ctx.quadraticCurveTo(22, 0, 14, 5); ctx.lineTo(-18, 5); ctx.quadraticCurveTo(-24, 2, -22, -4); ctx.fill();
    ctx.strokeStyle = '#f0c85a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-20, -4); ctx.lineTo(17, -4); ctx.stroke();
    // 선물 자루
    ctx.fillStyle = '#8b5a2b'; ctx.beginPath(); ctx.arc(-14, -8, 6.5, 0, PI * 2); ctx.fill();
    ctx.fillStyle = '#4fc27a'; ctx.fillRect(-12, -16, 4, 4);
    // 산타
    ctx.fillStyle = '#d9372d'; ctx.beginPath(); ctx.arc(1, -9, 5.4, 0, PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd9b8'; ctx.beginPath(); ctx.arc(2, -16.4, 3.5, 0, PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(3, -14.2, 3, 2.2, 0, 0, PI); ctx.fill();
    ctx.fillStyle = '#d9372d'; ctx.beginPath(); ctx.moveTo(-1.8, -18); ctx.lineTo(5.4, -18); ctx.lineTo(-3, -24); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-3, -24, 1.6, 0, PI * 2); ctx.fill();
    ctx.fillRect(-2, -19, 8, 1.8);
    ctx.restore();
  }

  // ---------- 그리기: 나무 ----------
  function tierPath(t) {
    const { ay, by, hw } = t;
    const n = 5, step = hw * 2 / n;
    ctx.beginPath();
    ctx.moveTo(CX, ay);
    ctx.quadraticCurveTo(CX + hw * 0.5, ay + (by - ay) * 0.6, CX + hw, by - 4);
    for (let i = 0; i < n; i++) {
      const x0 = CX + hw - i * step, x1 = x0 - step;
      ctx.quadraticCurveTo((x0 + x1) / 2, by + 9, x1, by - 4);
    }
    ctx.quadraticCurveTo(CX - hw * 0.5, ay + (by - ay) * 0.6, CX, ay);
    ctx.closePath();
  }
  function scallopPath(t) {
    const { by, hw } = t;
    const n = 5, step = hw * 2 / n;
    ctx.beginPath();
    ctx.moveTo(CX + hw, by - 4);
    for (let i = 0; i < n; i++) {
      const x0 = CX + hw - i * step, x1 = x0 - step;
      ctx.quadraticCurveTo((x0 + x1) / 2, by + 9, x1, by - 4);
    }
  }
  function drawTree(time, night) {
    // 트렁크
    const tg = ctx.createLinearGradient(138, 0, 162, 0);
    tg.addColorStop(0, '#6b4226'); tg.addColorStop(0.5, '#8a5a34'); tg.addColorStop(1, '#583319');
    ctx.fillStyle = tg; ctx.fillRect(138, 308, 24, 36);

    for (let i = TIERS.length - 1; i >= 0; i--) {
      const t = TIERS[i];
      ctx.save();
      ctx.shadowColor = 'rgba(0,10,30,.45)'; ctx.shadowBlur = 7 * K * DPR; ctx.shadowOffsetY = 2 * K * DPR;
      const g = ctx.createLinearGradient(0, t.ay, 0, t.by + 8);
      g.addColorStop(0, '#3aa863'); g.addColorStop(1, '#14603f');
      tierPath(t); ctx.fillStyle = g; ctx.fill();
      ctx.restore();
      ctx.save();
      tierPath(t); ctx.clip();
      const sh = ctx.createLinearGradient(CX - t.hw, 0, CX + t.hw, 0);
      sh.addColorStop(0, 'rgba(190,255,200,.16)'); sh.addColorStop(0.5, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,25,20,.38)');
      ctx.fillStyle = sh; ctx.fillRect(CX - t.hw, t.ay, t.hw * 2, t.by - t.ay + 12);
      // 가지 결
      ctx.strokeStyle = 'rgba(10,60,40,.35)'; ctx.lineWidth = 1;
      for (let k = 1; k <= 3; k++) {
        const yy = t.ay + (t.by - t.ay) * (0.28 + k * 0.2);
        const ww = t.hw * (yy - t.ay) / (t.by - t.ay);
        ctx.beginPath(); ctx.moveTo(CX - ww, yy + 5); ctx.quadraticCurveTo(CX, yy - 3, CX + ww, yy + 5); ctx.stroke();
      }
      ctx.restore();
      tierPath(t); ctx.strokeStyle = 'rgba(190,255,210,.28)'; ctx.lineWidth = 1; ctx.stroke();
      // 가지 끝에 쌓인 눈
      scallopPath(t); ctx.strokeStyle = 'rgba(255,255,255,.82)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.stroke();
    }
  }
  function drawLights(time, night) {
    const speed = lateNight ? 0.6 : 1;
    ctx.save();
    // 전선
    ctx.strokeStyle = 'rgba(10,45,30,.75)'; ctx.lineWidth = 0.9;
    bulbs.forEach((b) => {
      if (!b.wire) return;
      ctx.beginPath();
      b.wire.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    });
    const amp = (1 - 0.3 * dayAmt) * night;
    bulbs.forEach((b) => {
      if (b.wire) return;
      const tw = 0.5 + 0.5 * Math.sin(time * b.sp * speed + b.ph);
      const inten = clamp((0.35 + 0.65 * tw + flash) * amp, 0, 1.2);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = clamp(inten, 0, 1);
      const sz = 13 + 9 * tw + flash * 6;
      ctx.drawImage(glow(b.c), b.x - sz / 2, b.y - sz / 2, sz, sz);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.55 + 0.45 * clamp(inten, 0, 1);
      ctx.fillStyle = '#fffbe8';
      ctx.beginPath(); ctx.arc(b.x, b.y, 1.9, 0, PI * 2); ctx.fill();
      ctx.fillStyle = b.c; ctx.globalAlpha *= 0.75;
      ctx.beginPath(); ctx.arc(b.x, b.y, 2.7, 0, PI * 2); ctx.fill();
    });
    ctx.restore();
  }
  function drawStar(time, night) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 2.1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = (0.55 + 0.3 * pulse + flash * 0.3) * (0.75 + 0.25 * night);
    ctx.drawImage(glow('#ffd86e'), STAR.x - 36, STAR.y - 36, 72, 72);
    ctx.globalAlpha = 0.5 + 0.3 * pulse;
    ctx.translate(STAR.x, STAR.y); ctx.rotate(time * 0.25);
    const ray = ctx.createLinearGradient(-26, 0, 26, 0);
    ray.addColorStop(0, 'rgba(255,240,190,0)'); ray.addColorStop(0.5, 'rgba(255,245,210,.9)'); ray.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.fillStyle = ray; ctx.fillRect(-26 - pulse * 4, -0.8, 52 + pulse * 8, 1.6);
    ctx.rotate(PI / 2); ctx.fillRect(-20 - pulse * 3, -0.8, 40 + pulse * 6, 1.6);
    ctx.restore();
    const g = ctx.createRadialGradient(STAR.x, STAR.y, 0, STAR.x, STAR.y, 13);
    g.addColorStop(0, '#fffbe0'); g.addColorStop(1, '#f2b632');
    ctx.fillStyle = g; starPath(STAR.x, STAR.y, 12.5, 5.4); ctx.fill();
    ctx.strokeStyle = '#d9972a'; ctx.lineWidth = 0.8; ctx.stroke();
  }
  function drawMound(night) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.16 * night;
    ctx.drawImage(glow('#ffc870'), 10, 270, 280, 150);
    ctx.restore();
    const g = ctx.createRadialGradient(CX, 342, 10, CX, 348, 132);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.65, '#e4eeff'); g.addColorStop(1, '#b8cdee');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(CX, 347, 127, 14, 0, 0, PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(110,145,200,.45)'; ctx.lineWidth = 1; ctx.stroke();
  }
  function drawDday() {
    const info = ddayInfo();
    ctx.font = '700 11px "Malgun Gothic", sans-serif';
    const tw = ctx.measureText(info.text).width;
    const w = tw + 18, h = 17, x = CX - w / 2, y = 372;
    ctx.fillStyle = 'rgba(24,32,58,.62)';
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 8.5); ctx.fill();
    ctx.strokeStyle = 'rgba(255,214,120,.55)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#ffe9b8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(info.text, CX, y + h / 2 + 0.5);
    return { x, y, w, h };
  }

  // ---------- 히트 테스트 ----------
  let mouse = { x: -99, y: -99 }, hover = null;
  const inR = (px, py, r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  let ddayRect = { x: 110, y: 372, w: 80, h: 17 };
  function hitTest(px, py) {
    if (wishOpen) return { k: 'ui' };
    if (bubbleVisible && inR(px, py, bubbleRect())) return { k: 'bubble' };
    if (sl.active && Math.abs(px - sl.x) < 56 && py > 12 && py < 58) return { k: 'sleigh' };
    for (let i = st.gifts.length - 1; i >= 0; i--) {
      const g = st.gifts[i], p = giftPose(g);
      if (Math.abs(px - p.x) <= 16 && py >= p.y - 32 && py <= p.y + 4) return { k: 'gift', g };
    }
    for (const o of st.orns) {
      if (o.pending) continue;
      const [ox, oy] = ORN_SLOTS[o.slot];
      if ((px - ox) ** 2 + (py - (oy + 6)) ** 2 < 100) return { k: 'orn', o };
    }
    if ((px - STAR.x) ** 2 + (py - STAR.y) ** 2 < 256) return { k: 'tree' };
    for (const t of TIERS) {
      if (py >= t.ay - 2 && py <= t.by + 10) {
        const hw = t.hw * clamp((py - t.ay) / (t.by - t.ay), 0, 1) + 6;
        if (Math.abs(px - CX) <= hw) return { k: 'tree' };
      }
    }
    if (px >= 138 && px <= 162 && py >= 308 && py <= 344) return { k: 'tree' };
    if (((px - CX) / 128) ** 2 + ((py - 347) / 16) ** 2 <= 1) return { k: 'tree' };
    if (inR(px, py, ddayRect)) return { k: 'tree' };
    return null;
  }

  // ---------- 입력 ----------
  let ignoring = true, pressed = null, dragging = false;
  window.api.ignoreMouse(true);
  function applyHit(h) {
    hover = h;
    const want = !h;
    if (want !== ignoring) { ignoring = want; window.api.ignoreMouse(want); }
    const kind = h && h.k;
    document.body.style.cursor = (kind === 'gift' || kind === 'sleigh' || kind === 'orn' || kind === 'bubble') ? 'pointer' : 'default';
  }
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX / K; mouse.y = e.clientY / K;
    if (pressed) {
      if (!dragging && (Math.abs(e.screenX - pressed.sx) > 4 || Math.abs(e.screenY - pressed.sy) > 4) && pressed.canDrag) {
        dragging = true;
      }
      if (dragging) { window.api.dragMove(); return; }
    }
    wind = clamp(wind + (e.movementX || 0) * 0.6, -110, 110);
    applyHit(hitTest(mouse.x, mouse.y));
  });
  window.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const h = hitTest(e.clientX / K, e.clientY / K);
    if (!h) return;
    const canDrag = h.k !== 'bubble' && h.k !== 'ui';
    pressed = { sx: e.screenX, sy: e.screenY, h, canDrag };
    if (canDrag) window.api.dragStart();
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button !== 0 || !pressed) return;
    const was = dragging, p = pressed;
    pressed = null; dragging = false;
    window.api.dragEnd();
    if (was) return;
    const h = hitTest(e.clientX / K, e.clientY / K) || p.h;
    handleClick(h, e.clientX / K, e.clientY / K);
  });
  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (hitTest(e.clientX / K, e.clientY / K)) window.api.menu();
  });

  function handleClick(h, x, y) {
    if (!h) return;
    switch (h.k) {
      case 'gift': openGift(h.g); break;
      case 'sleigh':
        burst(sl.x, sleighY(), 14, 'spark');
        Sound.shake(); Sound.bell();
        showBubble('🎅 산타', pick(['호호호! 메리 크리스마스!', '올해도 착하게 지냈군요. 호호호!', '선물은 트리 아래에 두고 갈게요!']), 3200);
        break;
      case 'orn':
        Sound.tap();
        burst(ORN_SLOTS[h.o.slot][0], ORN_SLOTS[h.o.slot][1] + 6, 6, 'spark');
        if (h.o.type === 'wish') showBubble('🌟 내가 단 소원', `“${h.o.text}”`, 5000);
        else showBubble(`✨ ${ITEM_NAME[h.o.type]}`, '선물로 받은 장식이에요. 트리가 더 예뻐졌어요.', 3200);
        break;
      case 'bubble': hideBubble(); break;
      case 'tree':
        Sound.tap();
        wobV += 14; flash = 1;
        burst(x, y, 7, 'spark');
        for (let i = 0; i < 6; i++) flakes.push({ x: x + rand(-30, 30), y: y + rand(-10, 10), r: rand(1.2, 2.4), vy: rand(30, 55), ph: rand(0, 6), amp: 8, front: true, temp: true });
        break;
      default: break;
    }
  }

  // ---------- 소원 ----------
  let wishOpen = false, resetArmed = 0;
  function openWish() {
    if (wishOpen) return;
    wishOpen = true;
    wishEl.classList.add('show');
    window.api.focusable(true);
    window.api.ignoreMouse(false); ignoring = false;
    setTimeout(() => wishInput.focus(), 80);
  }
  function closeWish() {
    wishOpen = false;
    wishEl.classList.remove('show');
    wishInput.value = '';
    window.api.focusable(false);
  }
  function submitWish() {
    const text = wishInput.value.trim();
    closeWish();
    if (!text) return;
    const o = addOrnament('wish', text);
    const [ox, oy] = ORN_SLOTS[o.slot];
    burst(ox, oy + 8, 18, 'spark');
    Sound.wish();
    flash = 1;
    showBubble('🌟 소원을 달았어요', `“${text}” — 반짝이는 별이 소원을 지켜줄 거예요.`, 6500);
  }
  document.getElementById('wishOk').addEventListener('click', submitWish);
  document.getElementById('wishCancel').addEventListener('click', closeWish);
  wishInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitWish();
    if (e.key === 'Escape') closeWish();
  });

  function resetAll() {
    if (T() > resetArmed) {
      resetArmed = T() + 8;
      showBubble('🧹 트리 비우기', '장식과 선물이 모두 사라져요. 정말이면 8초 안에 한 번 더 눌러주세요.', 7000);
      return;
    }
    resetArmed = 0;
    st.gifts = []; st.orns = []; opening.length = 0; flights.length = 0;
    st.nextGiftAt = Date.now() + 20000;
    save();
    showBubble('🎄 새 마음으로', '트리가 깨끗해졌어요. 곧 새 선물이 도착할 거예요.', 4000);
  }

  // ---------- 설정/명령 수신 ----------
  window.api.onSettings((s) => { S = Object.assign(S, s); Sound.configure(S); });
  window.api.onCmd((c) => {
    if (c === 'wish') openWish();
    if (c === 'reset') resetAll();
  });

  // ---------- 업데이트 ----------
  let spawnQueue = 0, nextQueueAt = 0, sec = 0, nextAmbient = 0;
  function update(dt) {
    const t = T();
    // 바람, 흔들림
    wind *= Math.pow(0.35, dt);
    const baseWind = Math.sin(t * 0.17) * 9;
    wobV += (-wob * 38 - wobV * 3.2) * dt;
    wob += wobV * dt;
    flash = Math.max(0, flash - dt * 1.2);

    // 눈
    const slow = lateNight ? 0.75 : 1;
    for (let i = flakes.length - 1; i >= 0; i--) {
      const f = flakes[i];
      f.y += f.vy * dt * slow;
      f.x += (Math.sin(t * 0.7 + f.ph) * f.amp + (wind + baseWind) * (0.3 + f.r * 0.25)) * dt;
      if (f.y > H + 6) {
        if (f.temp) { flakes.splice(i, 1); continue; }
        f.y = -6; f.x = rand(0, W);
      }
      if (f.x < -8) f.x = W + 8; else if (f.x > W + 8) f.x = -8;
    }

    // 파티클
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life += dt;
      if (p.life >= p.max) { parts.splice(i, 1); continue; }
      if (!p.still) {
        p.vy += (p.kind === 'confetti' ? 170 : 55) * dt;
        p.vx *= Math.pow(0.5, dt);
      }
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    }

    // 날아가는 장식
    for (let i = flights.length - 1; i >= 0; i--) {
      const f = flights[i];
      const u = clamp((t - f.t0) / f.dur, 0, 1);
      if (Math.random() < 0.6) twinkleAt(f.x, f.y);
      const e = u * u * (3 - 2 * u);
      f.x = f.from[0] + (f.to[0] - f.from[0]) * e;
      f.y = f.from[1] + (f.to[1] - f.from[1]) * e - Math.sin(u * PI) * 42;
      if (u >= 1) {
        f.orn.pending = false;
        burst(f.to[0], f.to[1] + 6, 10, 'spark');
        Sound.arrive();
        wobV += 5; flash = Math.max(flash, 0.7);
        flights.splice(i, 1);
      }
    }

    // 열리는 선물
    for (let i = opening.length - 1; i >= 0; i--) {
      const g = opening[i], u = t - g.rt.openAt;
      if (u >= 0.5 && !g.rt.burst) {
        g.rt.burst = true;
        const s = GIFT_SLOTS[g.slot];
        burst(s.x, s.y - 24, 22, 'confetti');
        burst(s.x, s.y - 24, 12, 'spark');
        Sound.open();
        showBubble(`🎁 ${ITEM_NAME[g.rt.item]} 도착!`, g.rt.msg);
        flights.push({ t0: t, dur: 1.15, from: [s.x, s.y - 26], to: [ORN_SLOTS[g.rt.orn.slot][0], ORN_SLOTS[g.rt.orn.slot][1] + 4], x: s.x, y: s.y - 26, item: g.rt.item, hue: g.rt.orn.hue, orn: g.rt.orn });
      }
      if (u >= 1.7) opening.splice(i, 1);
    }

    // 썰매
    if (!sl.nextAt) scheduleSleigh(true);
    if (!sl.active && t >= sl.nextAt && !wishOpen) { startSleigh(); }
    if (sl.active) {
      sl.x += sl.dir * 92 * dt;
      const y = sleighY();
      if (t > sl.bellAt) { if (Math.random() < 0.7) Sound.bell(); sl.bellAt = t + 0.22; }
      if (t > sl.trailAt) { twinkleAt(sl.x - sl.dir * rand(30, 70), y + rand(-4, 16)); sl.trailAt = t + 0.06; }
      if (!sl.dropped && ((sl.dir > 0 && sl.x > 130) || (sl.dir < 0 && sl.x < 170))) {
        sl.dropped = true;
        if (spawnGift({ x: sl.x, y: y + 6 })) {
          burst(sl.x, y + 6, 10, 'spark');
          showBubble('🎅 산타가 다녀갔어요', '트리 아래에 선물을 놓고 갔어요. 살짝 눌러볼까요?', 4500);
        }
      }
      if ((sl.dir > 0 && sl.x > W + 120) || (sl.dir < 0 && sl.x < -120)) { sl.active = false; scheduleSleigh(false); }
    }

    // 트리 위 은은한 반짝임
    if (t > nextAmbient) {
      nextAmbient = t + rand(0.25, 0.7);
      const tier = pick(TIERS);
      const yy = rand(tier.ay + 12, tier.by - 6);
      const ww = tier.hw * (yy - tier.ay) / (tier.by - tier.ay) * 0.85;
      twinkleAt(CX + rand(-ww, ww), yy);
    }

    // 1초 주기 작업
    sec += dt;
    if (sec >= 1) {
      sec = 0;
      updateTimeOfDay();
      const nowMs = Date.now();
      if (st.nextGiftAt && nowMs >= st.nextGiftAt && spawnQueue === 0) {
        spawnQueue = 1;
        st.nextGiftAt = nowMs + giftInterval();
        save();
      }
      if (spawnQueue > 0 && t >= nextQueueAt) {
        spawnQueue--;
        nextQueueAt = t + 1.4;
        spawnGift();
      }
    }
  }

  // ---------- 렌더 ----------
  function draw() {
    const t = T();
    const night = 1 - 0.4 * dayAmt;
    const s = K * DPR;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

    // 뒤쪽 눈
    flakes.forEach((f) => { if (!f.front) drawFlake(f); });

    // 썰매 (트리 뒤)
    if (sl.active) drawSleigh(sl.x, sleighY(), sl.dir);

    // 트리 (살랑거림)
    ctx.save();
    ctx.translate(CX, 340); ctx.transform(1, 0, wob * 0.012, 1, 0, 0); ctx.translate(-CX, -340);
    drawTree(t, night);
    drawMound(night);
    drawLights(t, night);
    // 장식
    st.orns.forEach((o) => {
      if (o.pending) return;
      const [ox, oy] = ORN_SLOTS[o.slot];
      const ang = Math.sin(t * 1.4 + o.id) * 0.07 + wob * 0.03;
      if (o.type === 'wish') {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.45 + 0.3 * Math.sin(t * 2.6 + o.id);
        ctx.drawImage(glow('#ffd86e'), ox - 15, oy - 7, 30, 30);
        ctx.restore();
      }
      drawOrn(o.type, o.hue, ox, oy, 1, ang);
    });
    drawStar(t, night);
    ctx.restore();

    // 선물
    st.gifts.forEach((g) => {
      const p = giftPose(g);
      drawGift(p.x, p.y, g.color, { rot: p.rot, scale: p.scale });
    });
    opening.forEach((g) => {
      const u = t - g.rt.openAt, sp = GIFT_SLOTS[g.slot];
      const o = { alpha: 1, rot: 0, scale: 1, lift: 0, lidRot: 0 };
      let x = sp.x;
      if (u < 0.5) { o.rot = Math.sin(u * 55) * 0.16; x += Math.sin(u * 70) * 1.2; }
      else {
        const k = easeOutQuad(clamp((u - 0.5) / 0.4, 0, 1));
        o.lift = k * 20; o.lidRot = k * 0.7;
        o.alpha = 1 - clamp((u - 1.2) / 0.5, 0, 1);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.9 * (1 - clamp((u - 0.7) / 0.9, 0, 1));
        ctx.drawImage(glow('#ffe9a0'), sp.x - 38, sp.y - 76, 76, 76);
        ctx.restore();
      }
      drawGift(x, sp.y, g.color, o);
    });
    // 날아가는 장식
    flights.forEach((f) => {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.8;
      ctx.drawImage(glow('#ffe9a0'), f.x - 14, f.y - 14, 28, 28);
      ctx.restore();
      drawOrn(f.item, f.hue, f.x, f.y - 6, 1.4, Math.sin(t * 9) * 0.25);
    });

    ddayRect = drawDday();

    // 파티클
    parts.forEach((p) => {
      const k = 1 - p.life / p.max;
      if (p.kind === 'confetti') {
        ctx.save(); ctx.globalAlpha = clamp(k * 1.6, 0, 1);
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.fillRect(-2, -1.2, 4, 2.4 * Math.abs(Math.cos(p.rot * 1.3)) + 0.6);
        ctx.restore();
      } else {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = clamp(Math.sin(k * PI), 0, 1);
        const sz = 14 * p.size * (0.6 + 0.4 * k);
        ctx.translate(p.x, p.y); ctx.rotate(p.rot * 0.3);
        ctx.drawImage(sparkSprite, -sz / 2, -sz / 2, sz, sz);
        ctx.restore();
      }
    });

    // 앞쪽 눈
    flakes.forEach((f) => { if (f.front) drawFlake(f); });
  }
  function drawFlake(f) {
    const sz = f.r * 3.4;
    ctx.globalAlpha = f.front ? 0.95 : 0.7;
    ctx.drawImage(flakeSprite, f.x - sz / 2, f.y - sz / 2, sz, sz);
    ctx.globalAlpha = 1;
  }

  // ---------- 메인 루프 ----------
  let last = performance.now();
  function frame(ts) {
    requestAnimationFrame(frame);
    const dt = (ts - last) / 1000;
    if (dt < 1 / 31) return;
    last = ts;
    update(Math.min(dt, 0.1));
    draw();
  }

  // ---------- 시작 ----------
  function greeting() {
    const d = ddayInfo(), now = new Date();
    const key = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    if (!st.intro) {
      st.intro = true; st.greetedDay = key; save();
      Sound.greet();
      showBubble('🎄 안녕하세요!', '시간이 지나면 트리 아래에 선물이 생겨요. 눌러서 열어보세요. 트리를 끌어 옮기고, 우클릭으로 소원도 달 수 있어요.', 11000);
      return;
    }
    if (st.greetedDay === key) return;
    st.greetedDay = key; save();
    const h = now.getHours();
    let head = h < 5 ? '늦은 밤이에요' : h < 11 ? '좋은 아침이에요' : h < 17 ? '안녕하세요' : '좋은 저녁이에요';
    let body = d.diff === 0 ? '메리 크리스마스! 오늘은 트리가 유난히 반짝여요.'
      : d.diff === 1 ? '내일이 크리스마스예요. 설레는 밤이 될 것 같아요.'
        : `크리스마스까지 ${d.diff}일 남았어요.`;
    Sound.greet();
    showBubble(`🎄 ${head}`, body, 6000);
  }

  (async function init() {
    try { S = Object.assign(S, await window.api.getSettings()); } catch (_) { /* ignore */ }
    Sound.configure(S);
    const nowMs = Date.now();
    if (!st.nextGiftAt) {
      st.nextGiftAt = nowMs + (S.fast ? 6000 : 25000);
    } else if (st.nextGiftAt < nowMs) {
      const missed = Math.min(3, Math.floor((nowMs - st.nextGiftAt) / (2 * 60000)) + 1);
      spawnQueue = S.fast ? 1 : missed;
      nextQueueAt = T() + 3;
      st.nextGiftAt = nowMs + giftInterval();
    }
    save();
    setTimeout(greeting, 1200);
    requestAnimationFrame(frame);
  })();

  // 디버그/테스트용
  window.__xmas = { st, spawnGift, openGift, startSleigh, showBubble, openWish, burst, flakes };
})();
