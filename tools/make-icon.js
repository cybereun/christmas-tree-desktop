// 256x256 트리 아이콘 PNG 생성 (의존성 없음)
const zlib = require('zlib'), fs = require('fs');
const N = 256, SS = 3;
const px = Buffer.alloc(N * N * 4);
function inTri(x, y, ax, ay, by, hw) { if (y < ay || y > by) return false; return Math.abs(x - 128) <= hw * (y - ay) / (by - ay); }
function sample(x, y) {
  // returns [r,g,b,a]
  const dx = x - 128, dy = y - 38;
  const R = Math.hypot(dx, dy);
  // star
  const ang = Math.atan2(dy, dx) + Math.PI / 2;
  const k = ((ang % (2 * Math.PI / 5)) + 2 * Math.PI / 5) % (2 * Math.PI / 5);
  const rr = 22 - 12 * Math.abs(k / (Math.PI / 5) - 1) * -1; // rough
  const starR = 13 + 11 * Math.pow(Math.abs(Math.cos(2.5 * ang)), 3);
  if (R < starR * 0.9) return [255, 214, 80, 255];
  if (x > 114 && x < 142 && y > 205 && y < 236) return [110, 70, 38, 255];
  const tiers = [[48, 110, 52], [80, 160, 78], [112, 214, 104]];
  for (let i = 2; i >= 0; i--) {
    const [ay, by, hw] = tiers[i];
    if (inTri(x, y, 128, ay, by + 6, hw)) {
      const g = (y - ay) / (by - ay);
      return [30 + 10 * g, 130 - 30 * g, 80 - 10 * g, 255];
    }
  }
  return [0, 0, 0, 0];
}
const dots = [[100, 120, [255, 90, 90]], [150, 100, [110, 200, 255]], [128, 150, [255, 220, 110]], [92, 180, [255, 150, 220]], [166, 172, [140, 255, 150]], [128, 200, [255, 90, 90]], [70, 205, [255, 220, 110]], [190, 205, [110, 200, 255]]];
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  let r = 0, g = 0, b = 0, a = 0;
  for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
    const X = x + (sx + 0.5) / SS, Y = y + (sy + 0.5) / SS;
    let c = sample(X, Y);
    for (const [dx, dy, col] of dots) if (c[3] && Math.hypot(X - dx, Y - dy) < 7) c = [...col, 255];
    r += c[0] * c[3]; g += c[1] * c[3]; b += c[2] * c[3]; a += c[3];
  }
  const o = (y * N + x) * 4;
  if (a) { px[o] = r / a; px[o + 1] = g / a; px[o + 2] = b / a; px[o + 3] = a / (SS * SS); }
}
const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (b) => { let c = -1; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const raw = Buffer.alloc((N * 4 + 1) * N);
for (let y = 0; y < N; y++) { raw[y * (N * 4 + 1)] = 0; px.copy(raw, y * (N * 4 + 1) + 1, y * N * 4, (y + 1) * N * 4); }
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4); ihdr[8] = 8; ihdr[9] = 6;
fs.writeFileSync(process.argv[2], Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
