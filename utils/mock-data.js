var cats = [
  { id: 1, name: '招牌热菜', icon: '🔥' },
  { id: 2, name: '家常小炒', icon: '🍳' },
  { id: 3, name: '汤羹主食', icon: '🍲' },
  { id: 4, name: '清爽素菜', icon: '🥬' },
];

var all = [
  {
    i: 1,
    c: 1,
    n: '冷吃牛肉',
    e: '🥩',
    p: 32,
    o: 38,
    s: 128,
    r: 4.9,
    t: '招牌',
    d: '麻辣鲜香，牛肉紧实有嚼劲，适合下饭或当小食。',
    sp: [{ n: '辣度', o: ['微辣', '中辣', '特辣'] }],
  },
  {
    i: 2,
    c: 2,
    n: '番茄炒鸡蛋',
    e: '🍅',
    p: 18,
    o: 18,
    s: 96,
    r: 4.8,
    t: '家常',
    d: '酸甜开胃，鸡蛋软嫩，老人孩子都合适。',
  },
  {
    i: 3,
    c: 2,
    n: '青椒炒肉',
    e: '🌶️',
    p: 26,
    o: 28,
    s: 112,
    r: 4.8,
    t: '下饭',
    d: '青椒清香，肉片鲜嫩，是稳定受欢迎的下饭菜。',
    sp: [{ n: '辣度', o: ['不辣', '微辣', '中辣'] }],
  },
  {
    i: 4,
    c: 4,
    n: '素炒小白菜',
    e: '🥬',
    p: 16,
    o: 16,
    s: 86,
    r: 4.7,
    t: '清爽',
    d: '清淡爽口，适合搭配重口味主菜。',
  },
  {
    i: 5,
    c: 1,
    n: '水煮鱼片',
    e: '🐟',
    p: 48,
    o: 58,
    s: 74,
    r: 4.9,
    t: '人气',
    d: '鱼片滑嫩，麻辣汤底香气足，适合多人分享。',
    sp: [{ n: '辣度', o: ['微辣', '中辣', '特辣'] }],
  },
  {
    i: 6,
    c: 3,
    n: '紫菜蛋花汤',
    e: '🍲',
    p: 12,
    o: 12,
    s: 68,
    r: 4.6,
    t: '暖汤',
    d: '清淡热汤，搭配米饭和小炒都合适。',
  },
  {
    i: 7,
    c: 3,
    n: '扬州炒饭',
    e: '🍚',
    p: 22,
    o: 25,
    s: 91,
    r: 4.7,
    t: '主食',
    d: '米粒分明，配料丰富，一份就能吃饱。',
    sp: [{ n: '份量', o: ['标准', '加量 +¥6'] }],
  },
  {
    i: 8,
    c: 4,
    n: '蒜蓉西兰花',
    e: '🥦',
    p: 20,
    o: 22,
    s: 57,
    r: 4.6,
    t: '清爽',
    d: '蒜香浓郁，口感脆嫩，适合补充蔬菜。',
  },
];

var byCat = {};

for (var i = 0; i < cats.length; i++) {
  byCat[cats[i].id] = [];
}

for (var j = 0; j < all.length; j++) {
  if (!byCat[all[j].c]) byCat[all[j].c] = [];
  byCat[all[j].c].push(all[j]);
}

var hot = all.slice(0, 6);

function search(keyword) {
  if (!keyword || !keyword.trim()) return [];

  var q = keyword.toLowerCase();
  var result = [];

  for (var i = 0; i < all.length; i++) {
    var food = all[i];
    if (
      food.n.toLowerCase().indexOf(q) !== -1 ||
      (food.t && food.t.toLowerCase().indexOf(q) !== -1) ||
      (food.d && food.d.toLowerCase().indexOf(q) !== -1)
    ) {
      result.push(food);
    }
  }

  return result;
}

function byId(id) {
  for (var i = 0; i < all.length; i++) {
    if (String(all[i].i) === String(id)) return all[i];
  }
  return null;
}

module.exports = {
  cats: cats,
  byCat: byCat,
  hot: hot,
  all: all,
  search: search,
  byId: byId,
};
