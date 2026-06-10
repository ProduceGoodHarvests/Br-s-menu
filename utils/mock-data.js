// 模拟数据模块 — 所有数据均为本地模拟，无需服务端

// 菜品分类
const categories = [
  { id: 1, name: '热销推荐', icon: '🔥' },
  { id: 2, name: '主食套餐', icon: '🍚' },
  { id: 3, name: '小吃饮品', icon: '🥤' },
  { id: 4, name: '甜点烘焙', icon: '🍰' },
  { id: 5, name: '汤粉面', icon: '🍜' },
  { id: 6, name: '凉菜卤味', icon: '🥗' },
];

// 菜品列表
const foods = [
  // 热销推荐
  { id: 1, categoryId: 1, name: '招牌红烧牛肉面', icon: '🍜', price: 32, originalPrice: 38, sales: 3260, rating: 4.8, desc: '精选牛腱子肉，慢炖8小时，汤浓肉香', tag: '招牌', specs: [{ name: '份量', options: ['大份', '小份'] }] },
  { id: 2, categoryId: 1, name: '麻辣小龙虾盖饭', icon: '🦞', price: 38, originalPrice: 48, sales: 2180, rating: 4.7, desc: '鲜活小龙虾搭配秘制麻辣酱汁', tag: '爆款', specs: [{ name: '辣度', options: ['微辣', '中辣', '特辣'] }] },
  { id: 3, categoryId: 1, name: '奥尔良烤鸡腿堡', icon: '🍔', price: 22, originalPrice: 28, sales: 4100, rating: 4.6, desc: '整只鸡腿肉，奥尔良风味腌制', tag: '人气', specs: [{ name: '套餐', options: ['单品', '+可乐薯条 ¥12'] }] },
  { id: 4, categoryId: 1, name: '珍珠奶茶', icon: '🧋', price: 12, originalPrice: 16, sales: 5800, rating: 4.9, desc: '手工熬煮黑糖珍珠，奶香浓郁', tag: '', specs: [{ name: '甜度', options: ['全糖', '半糖', '无糖'] }, { name: '温度', options: ['常温', '加冰'] }] },

  // 主食套餐
  { id: 5, categoryId: 2, name: '黑椒牛排套餐', icon: '🥩', price: 45, originalPrice: 58, sales: 1560, rating: 4.7, desc: '澳洲谷饲牛排，搭配黑椒汁与时蔬', tag: '品质', specs: [{ name: '熟度', options: ['七分熟', '全熟'] }] },
  { id: 6, categoryId: 2, name: '番茄鸡蛋盖饭', icon: '🍅', price: 18, originalPrice: 22, sales: 2900, rating: 4.5, desc: '家常味道，番茄酸甜可口', tag: '', specs: [{ name: '份量', options: ['标准', '加量+¥5'] }] },
  { id: 7, categoryId: 2, name: '宫保鸡丁盖饭', icon: '🍗', price: 22, originalPrice: 26, sales: 2340, rating: 4.6, desc: '经典川味，花生与鸡丁的完美搭配', tag: '下饭', specs: [{ name: '份量', options: ['标准', '加量+¥5'] }] },
  { id: 8, categoryId: 2, name: '日式照烧鸡腿饭', icon: '🐔', price: 28, originalPrice: 35, sales: 1890, rating: 4.8, desc: '照烧鸡腿配溏心蛋，米饭浇汁', tag: '新品', specs: [{ name: '份量', options: ['标准', '加量+¥5'] }] },

  // 小吃饮品
  { id: 9, categoryId: 3, name: '香辣鸡米花', icon: '🍿', price: 15, originalPrice: 19, sales: 3400, rating: 4.5, desc: '外酥里嫩，一口一个停不下来', tag: '', specs: [{ name: '份量', options: ['小份', '大份+¥8'] }] },
  { id: 10, categoryId: 3, name: '芒果冰沙', icon: '🥭', price: 16, originalPrice: 20, sales: 2700, rating: 4.7, desc: '新鲜芒果现打，冰凉爽口', tag: '夏日', specs: [] },
  { id: 11, categoryId: 3, name: '柠檬气泡水', icon: '🍋', price: 10, originalPrice: 14, sales: 4500, rating: 4.6, desc: '鲜榨柠檬+气泡水，解腻首选', tag: '', specs: [] },
  { id: 12, categoryId: 3, name: '炸薯条', icon: '🍟', price: 12, originalPrice: 15, sales: 3800, rating: 4.4, desc: '金黄酥脆，搭配番茄酱', tag: '', specs: [{ name: '份量', options: ['中份', '大份+¥5'] }] },

  // 甜点烘焙
  { id: 13, categoryId: 4, name: '提拉米苏', icon: '🍰', price: 24, originalPrice: 30, sales: 1200, rating: 4.8, desc: '经典意式甜点，咖啡与奶油的邂逅', tag: '人气', specs: [] },
  { id: 14, categoryId: 4, name: '芒果千层蛋糕', icon: '🎂', price: 28, originalPrice: 36, sales: 980, rating: 4.9, desc: '层层奶油与芒果肉，口感丰富', tag: '推荐', specs: [{ name: '规格', options: ['切片', '6寸整只+¥68'] }] },
  { id: 15, categoryId: 4, name: '蛋挞（4只装）', icon: '🥧', price: 16, originalPrice: 20, sales: 3100, rating: 4.6, desc: '酥脆外皮，嫩滑蛋液', tag: '', specs: [{ name: '数量', options: ['4只', '8只+¥14'] }] },

  // 汤粉面
  { id: 16, categoryId: 5, name: '酸辣粉', icon: '🌶️', price: 16, originalPrice: 20, sales: 3600, rating: 4.7, desc: '重庆风味，酸辣爽口', tag: '火爆', specs: [{ name: '辣度', options: ['微辣', '中辣', '特辣'] }] },
  { id: 17, categoryId: 5, name: '鲜虾云吞面', icon: '🦐', price: 26, originalPrice: 32, sales: 2100, rating: 4.8, desc: '鲜虾大云吞配竹升面，汤清味鲜', tag: '', specs: [{ name: '份量', options: ['标准', '加面+¥4'] }] },
  { id: 18, categoryId: 5, name: '螺蛳粉', icon: '🥘', price: 18, originalPrice: 22, sales: 4200, rating: 4.5, desc: '柳州风味，酸笋臭味十足', tag: '猎奇', specs: [{ name: '辣度', options: ['微辣', '中辣', '特辣'] }] },

  // 凉菜卤味
  { id: 19, categoryId: 6, name: '凉拌三丝', icon: '🥒', price: 12, originalPrice: 16, sales: 2500, rating: 4.4, desc: '清爽开胃，夏天必备', tag: '', specs: [] },
  { id: 20, categoryId: 6, name: '卤鸭脖', icon: '🦆', price: 20, originalPrice: 26, sales: 1900, rating: 4.6, desc: '秘制卤料，香辣入味', tag: '', specs: [{ name: '辣度', options: ['五香', '微辣', '麻辣'] }] },
];

// 桌号列表（模拟堂食）
const tables = [
  { id: 1, name: 'A01 桌', area: 'A区大厅' },
  { id: 2, name: 'A02 桌', area: 'A区大厅' },
  { id: 3, name: 'A03 桌', area: 'A区大厅' },
  { id: 4, name: 'B01 桌', area: 'B区靠窗' },
  { id: 5, name: 'B02 桌', area: 'B区靠窗' },
  { id: 6, name: 'C01 包间', area: 'C区包间' },
];

// 搜索关键词 -> 菜品id列表（简单模拟搜索）
function searchFoods(keyword) {
  if (!keyword || keyword.trim() === '') return foods;
  const kw = keyword.toLowerCase();
  return foods.filter(f =>
    f.name.toLowerCase().includes(kw) ||
    f.desc.toLowerCase().includes(kw) ||
    (f.tag && f.tag.toLowerCase().includes(kw))
  );
}

// 根据分类获取菜品
function getFoodsByCategory(categoryId) {
  if (!categoryId) return foods;
  return foods.filter(f => f.categoryId === categoryId);
}

// 根据id获取菜品
function getFoodById(id) {
  return foods.find(f => f.id === id) || null;
}

// 获取热销菜品
function getHotFoods(limit = 6) {
  return [...foods].sort((a, b) => b.sales - a.sales).slice(0, limit);
}

module.exports = {
  categories,
  foods,
  tables,
  searchFoods,
  getFoodsByCategory,
  getFoodById,
  getHotFoods,
};
