var mock = require('./mock-data');
var storage = require('./storage');

var ALL_CATEGORY = { id: 0, name: '全部', icon: '📋' };

function getCategoryMap() {
  var map = {};
  for (var i = 0; i < mock.cats.length; i++) {
    map[mock.cats[i].id] = mock.cats[i];
  }
  return map;
}

function getCategoryIcon(categoryId) {
  var map = getCategoryMap();
  return map[categoryId] ? map[categoryId].icon : '🍽️';
}

function normalizeDish(food) {
  if (!food) return null;

  var categoryId = food.c || food.categoryId || 1;
  var id = food.i || food.id || food._id;
  var price = Number(food.p || food.price || 0);
  var originalPrice = Number(food.o || food.originalPrice || price);
  var specs = food.sp || food.specs || [];

  return {
    id: id,
    name: food.n || food.name || '',
    icon: food.e || food.icon || getCategoryIcon(categoryId),
    price: price,
    originalPrice: originalPrice,
    sales: food.s || food.sales || 0,
    rating: food.r || food.rating || 4.8,
    tag: food.t || food.tag || '',
    desc: food.d || food.desc || '',
    specs: specs,
    categoryId: categoryId,
    source: food._custom ? 'custom' : 'builtin',
  };
}

function getCategories(includeAll) {
  var list = includeAll ? [ALL_CATEGORY] : [];
  return list.concat(mock.cats);
}

function getAllDishes() {
  return mock.all.concat(storage.getCustomDishes());
}

function getHotDishes() {
  return mock.hot.concat(storage.getCustomDishes().slice(0, 2));
}

function getDishesByCategory(categoryId) {
  if (!categoryId) return getAllDishes();

  var result = [];
  var all = getAllDishes();

  for (var i = 0; i < all.length; i++) {
    if (Number(all[i].c || all[i].categoryId) === Number(categoryId)) {
      result.push(all[i]);
    }
  }

  return result;
}

function getDishById(id) {
  var all = getAllDishes();

  for (var i = 0; i < all.length; i++) {
    if (String(all[i].i || all[i].id || all[i]._id) === String(id)) {
      return all[i];
    }
  }

  return null;
}

function searchDishes(keyword) {
  if (!keyword || !keyword.trim()) return [];

  var q = keyword.trim().toLowerCase();
  var all = getAllDishes();
  var result = [];

  for (var i = 0; i < all.length; i++) {
    var food = all[i];
    var name = String(food.n || food.name || '').toLowerCase();
    var tag = String(food.t || food.tag || '').toLowerCase();
    var desc = String(food.d || food.desc || '').toLowerCase();

    if (name.indexOf(q) !== -1 || tag.indexOf(q) !== -1 || desc.indexOf(q) !== -1) {
      result.push(food);
    }
  }

  return result;
}

function getTagOptions(list) {
  var tags = [{ name: '全部', value: '' }];
  var seen = {};

  for (var i = 0; i < list.length; i++) {
    var tag = list[i].t || list[i].tag || '';
    if (tag && !seen[tag]) {
      seen[tag] = true;
      tags.push({ name: tag, value: tag });
    }
  }

  return tags;
}

function createCustomDish(name, price, categoryId, tag) {
  var id = 'custom-' + Date.now();
  return {
    i: id,
    c: Number(categoryId) || 1,
    n: name,
    e: getCategoryIcon(Number(categoryId) || 1),
    p: Number(price),
    o: Number(price),
    s: 0,
    r: 4.8,
    t: tag || '新品',
    d: '商家新增菜品，可在后台继续维护。',
    sp: [],
    _custom: true,
  };
}

function getManageDishes() {
  var dishes = getAllDishes();
  var result = [];

  for (var i = 0; i < dishes.length; i++) {
    var item = normalizeDish(dishes[i]);
    item.canDelete = item.source === 'custom';
    result.push(item);
  }

  return result;
}

module.exports = {
  normalizeDish: normalizeDish,
  getCategories: getCategories,
  getAllDishes: getAllDishes,
  getHotDishes: getHotDishes,
  getDishesByCategory: getDishesByCategory,
  getDishById: getDishById,
  searchDishes: searchDishes,
  getTagOptions: getTagOptions,
  createCustomDish: createCustomDish,
  getManageDishes: getManageDishes,
};
