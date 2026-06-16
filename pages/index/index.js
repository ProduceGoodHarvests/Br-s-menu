var menu = require('../../utils/menu');
var storage = require('../../utils/storage');
var format = require('../../utils/format');

var PAGE_SIZE = 30;

function toViewList(list) {
  var result = [];
  for (var i = 0; i < list.length; i++) {
    result.push(menu.normalizeDish(list[i]));
  }
  return result;
}

function defaultSpecs(food) {
  var specs = [];
  var raw = food.sp || food.specs || [];

  for (var i = 0; i < raw.length; i++) {
    specs.push({
      name: raw[i].n || raw[i].name,
      value: (raw[i].o || raw[i].options || [])[0],
    });
  }

  return specs;
}

Page({
  data: {
    searchKeyword: '',
    categories: [],
    activeCategory: 0,
    tags: [],
    activeTag: '',
    hotFoods: [],
    foodList: [],
    searchResults: [],
    showSearch: false,
    hasMore: false,
    cartCount: 0,
  },

  onLoad: function () {
    this.initData();
  },

  onShow: function () {
    this.initData();
    this.updateCartBadge();
  },

  initData: function () {
    var all = menu.getAllDishes();
    this.setData({
      categories: menu.getCategories(true),
      hotFoods: toViewList(menu.getHotDishes()).slice(0, 8),
      tags: menu.getTagOptions(all),
    });
    this.applyFilters();
  },

  getFilteredSource: function () {
    var list = menu.getDishesByCategory(this.data.activeCategory);
    var tag = this.data.activeTag;

    if (!tag) return list;

    var filtered = [];
    for (var i = 0; i < list.length; i++) {
      if ((list[i].t || list[i].tag || '') === tag) {
        filtered.push(list[i]);
      }
    }

    return filtered;
  },

  applyFilters: function () {
    var normalized = toViewList(this.getFilteredSource());
    this._fullList = normalized;

    this.setData({
      foodList: normalized.slice(0, PAGE_SIZE),
      hasMore: normalized.length > PAGE_SIZE,
    });
  },

  switchCategory: function (e) {
    var id = Number(e.currentTarget.dataset.id || 0);
    this.setData({
      activeCategory: id,
      activeTag: '',
      tags: menu.getTagOptions(menu.getDishesByCategory(id)),
    });
    this.applyFilters();
  },

  selectTag: function (e) {
    this.setData({ activeTag: e.currentTarget.dataset.tag || '' });
    this.applyFilters();
  },

  loadMore: function () {
    if (!this.data.hasMore) return;

    var current = this.data.foodList;
    var more = this._fullList.slice(current.length, current.length + PAGE_SIZE);

    this.setData({
      foodList: current.concat(more),
      hasMore: current.length + more.length < this._fullList.length,
    });
  },

  onSearchInput: function (e) {
    var keyword = e.detail.value || '';
    var results = keyword.trim() ? toViewList(menu.searchDishes(keyword)).slice(0, 40) : [];

    this.setData({
      searchKeyword: keyword,
      searchResults: results,
      showSearch: !!keyword.trim(),
    });
  },

  cancelSearch: function () {
    this.setData({
      searchKeyword: '',
      searchResults: [],
      showSearch: false,
    });
  },

  goDetail: function (e) {
    wx.navigateTo({
      url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id,
    });
  },

  addToCart: function (e) {
    var id = e.currentTarget.dataset.id;
    var food = menu.getDishById(id);
    if (!food) return;

    var normalized = menu.normalizeDish(food);
    var specs = defaultSpecs(food);
    var unitPrice = format.calcUnitPrice(normalized.price, specs);
    var specKey = format.buildSpecKey(specs);
    var cart = storage.getCart();
    var index = -1;

    for (var i = 0; i < cart.length; i++) {
      if (String(cart[i].id) === String(normalized.id) && (cart[i].specKey || '') === specKey) {
        index = i;
        break;
      }
    }

    if (index > -1) {
      cart[index].quantity += 1;
    } else {
      cart.push({
        id: normalized.id,
        name: normalized.name,
        icon: normalized.icon,
        price: unitPrice,
        specs: specs,
        specKey: specKey,
        quantity: 1,
      });
    }

    storage.setCart(cart);
    this.updateCartBadge();

    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' });
    wx.showToast({ title: '已加入购物车', icon: 'success', duration: 800 });
  },

  updateCartBadge: function () {
    var app = getApp();
    if (app && app.updateCartCount) {
      app.updateCartCount();
      this.setData({ cartCount: app.globalData.cartCount });
    }
  },
});
