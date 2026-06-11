var cats = [
  { id: 1, name: '家常菜', icon: '🍳', e: ['🥩', '🍅', '🌶️', '🥬'] },
];

var all = [
  {
    i: 1,
    c: 1,
    n: '冷吃牛肉',
    e: '🥩',
    p: 32,
    o: 32,
    s: 128,
    r: 4.9,
    t: '招牌',
    d: '麻辣鲜香，适合作为下饭菜或小吃。',
    sp: [{ n: '辣度', o: ['微辣', '中辣', '特辣'] }],
  },
  {
    i: 2,
    c: 1,
    n: '番茄炒鸡蛋',
    e: '🍅',
    p: 18,
    o: 18,
    s: 96,
    r: 4.8,
    t: '家常',
    d: '酸甜开胃，鸡蛋软嫩。',
  },
  {
    i: 3,
    c: 1,
    n: '青椒炒肉',
    e: '🌶️',
    p: 26,
    o: 26,
    s: 112,
    r: 4.8,
    t: '下饭',
    d: '青椒清香，肉片鲜嫩。',
    sp: [{ n: '辣度', o: ['微辣', '中辣'] }],
  },
  {
    i: 4,
    c: 1,
    n: '素炒小白菜',
    e: '🥬',
    p: 16,
    o: 16,
    s: 86,
    r: 4.7,
    t: '清爽',
    d: '清淡爽口，适合搭配主菜。',
  },
];

var byCat = { 1: all };
var hot = all.slice();

function search(k) {
  if (!k || !k.trim()) return [];
  k = k.toLowerCase();
  var r = [];
  for (var i = 0; i < all.length; i++) {
    var f = all[i];
    if (
      f.n.toLowerCase().indexOf(k) !== -1 ||
      (f.t && f.t.toLowerCase().indexOf(k) !== -1) ||
      (f.d && f.d.toLowerCase().indexOf(k) !== -1)
    ) {
      r.push(f);
    }
  }
  return r;
}

function byId(id) {
  for (var i = 0; i < all.length; i++) {
    if (all[i].i === id) return all[i];
  }
  return null;
}

module.exports = { cats: cats, byCat: byCat, hot: hot, all: all, search: search, byId: byId };
