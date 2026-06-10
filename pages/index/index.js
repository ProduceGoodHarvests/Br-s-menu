// pages/index/index.js
var mock = require('../../utils/mock-data');
var storage = require('../../utils/storage');
var PAGE_SIZE = 30;

function norm(f) {
  return { id: f.i, name: f.n, icon: f.e, price: f.p, originalPrice: f.o, sales: f.s, rating: f.r, tag: f.t || '', specs: f.sp || [], categoryId: f.c };
}

// 合并内置+自定义菜品
function allFoods() {
  var custom = storage.getCustomDishes();
  return mock.all.concat(custom);
}

// 根据分类获取（含自定义）
function byCat(cid) {
  var builtin = mock.byCat[cid] || [];
  var custom = storage.getCustomDishes();
  var result = builtin.slice();
  for (var i = 0; i < custom.length; i++) {
    if (custom[i].c === cid) result.push(custom[i]);
  }
  return result;
}

// 根据ID查找（含自定义）
function byId(id) {
  var f = mock.byId(id);
  if (f) return f;
  var custom = storage.getCustomDishes();
  for (var i = 0; i < custom.length; i++) {
    if (custom[i].i === id) return custom[i];
  }
  return null;
}

// 搜索（含自定义）
function search(kw) {
  var result = mock.search(kw).slice(0, 30);
  var custom = storage.getCustomDishes();
  kw = kw.toLowerCase();
  for (var i = 0; i < custom.length; i++) {
    var c = custom[i];
    if (result.length >= 40) break;
    if (c.n.toLowerCase().indexOf(kw) !== -1 || (c.t && c.t.toLowerCase().indexOf(kw) !== -1)) {
      result.push(c);
    }
  }
  return result;
}

Page({
  data: {
    searchKeyword: '', categories: [], activeCategory: 0,
    foodList: [], hotFoods: [], cartCount: 0,
    showSearch: false, searchResults: [], hasMore: false,
  },

  onLoad: function () { this.initData(); },
  onShow: function () { this.initData(); this.updateCartBadge(); },

  initData: function () {
    var cats = mock.cats;
    var hot = mock.hot.slice(0, 8).map(norm);
    var allCats = [{ id: 0, name: '全部', icon: '📋' }].concat(cats);
    this.setData({ categories: allCats, hotFoods: hot });
    this.switchCategory({ currentTarget: { dataset: { id: '0' } } });
  },

  switchCategory: function (e) {
    var cid = parseInt(e.currentTarget.dataset.id);
    var list = (cid === 0 ? allFoods() : byCat(cid)).map(norm);
    var page = list.slice(0, PAGE_SIZE);
    this.setData({ activeCategory: cid, foodList: page, hasMore: list.length > PAGE_SIZE });
    this._fullList = list;
  },

  loadMore: function () {
    if (!this.data.hasMore) return;
    var cur = this.data.foodList;
    var more = this._fullList.slice(cur.length, cur.length + PAGE_SIZE);
    this.setData({ foodList: cur.concat(more), hasMore: (cur.length + more.length) < this._fullList.length });
  },

  onSearchInput: function (e) {
    var kw = e.detail.value;
    this.setData({ searchKeyword: kw });
    if (kw.trim()) {
      this.setData({ searchResults: search(kw).map(norm), showSearch: true });
    } else {
      this.setData({ showSearch: false, searchResults: [] });
    }
  },

  cancelSearch: function () {
    this.setData({ searchKeyword: '', showSearch: false, searchResults: [] });
  },

  goDetail: function (e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + parseInt(e.currentTarget.dataset.id) });
  },

  addToCart: function (e) {
    var foodId = parseInt(e.currentTarget.dataset.id);
    var f = byId(foodId);
    if (!f) return;
    var specs = f.sp ? f.sp.map(function(s) { return { name: s.n, value: s.o[0] }; }) : [];
    var specKey = specs.map(function(s) { return s.name + ':' + s.value; }).join('|');
    var cart = storage.getCart();
    var idx = -1;
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === foodId && (cart[i].specKey || '') === specKey) { idx = i; break; }
    }
    if (idx > -1) { cart[idx].quantity += 1; }
    else { cart.push({ id: f.i, name: f.n, icon: f.e, price: f.p, specs: specs, specKey: specKey, quantity: 1 }); }
    storage.setCart(cart);
    this.updateCartBadge();
    wx.showToast({ title: '已加入购物车', icon: 'success', duration: 800 });
  },

  updateCartBadge: function () {
    var cart = storage.getCart(), count = 0;
    for (var i = 0; i < cart.length; i++) count += cart[i].quantity;
    this.setData({ cartCount: count });
    var app = getApp();
    if (app) app.globalData.cartCount = count;
  },
});
