const crypto = require('crypto');

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randf = (min, max) => Math.round((Math.random() * (max - min) + min) * 100) / 100;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const txId = (p) => `${p}-${crypto.randomUUID().slice(0, 8)}-${Date.now()}`;
const addD = (d, days) => { const r = new Date(d); r.setDate(r.getDate() + days); return r; };
const fmt = (d) => d.toISOString().slice(0, 10);

const distribDates = (start, end, count) => {
  const s = new Date(start), e = new Date(end);
  const td = Math.floor((e - s) / 86400000);
  if (td <= 0 || count <= 0) return count > 0 ? [fmt(s)] : [];
  const dates = [], used = new Set();
  for (let i = 0; i < count && i <= td; i++) {
    let off, a = 0;
    do { off = Math.floor(Math.random() * (td + 1)); a++; } while (used.has(off) && a < 50);
    used.add(off);
    dates.push(fmt(addD(s, off)));
  }
  return dates.sort();
};

const monthDiff = (d1, d2) => (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());

module.exports = { rand, randf, pick, txId, addD, fmt, distribDates, monthDiff };
