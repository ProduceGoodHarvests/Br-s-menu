// pages/detail/detail.js
var mock = require('../../utils/mock-data');
var storage = require('../../utils/storage');

var cn = {};
mock.cats.forEach(function(c) { cn[c.id] = c.name; });

function norm(f) {
  return { id: f.i, name: f.n, icon: f.e, categoryName: cn[f.c] || '', price: f.p, originalPrice: f.o, sales: f.s, rating: f.r, tag: f.t || '', specs: (f.sp || []).map(function(s) { return { name: s.n, options: s.o }; }), categoryId: f.c };
}

function findById(id) {
  var f = mock.byId(id);
  if (f) return f;
  var custom = storage.getCustomDishes();
  for (var i = 0; i < custom.length; i++) { if (custom[i].i === id) return custom[i]; }
  return null;
}

Page({
  data: { food: null, quantity: 1, selectedSpecs: {}, totalPrice: 0 },

  onLoad: function (options) {
    var f = findById(parseInt(options.id));
    if (!f) { wx.showToast({ title: '菜品不存在', icon: 'none' }); return; }
    var food = norm(f);
    var sel = {};
    if (food.specs.length > 0) {
      for (var i = 0; i < food.specs.length; i++) { sel[food.specs[i].name] = food.specs[i].options[0]; }
    }
    this.setData({ food: food, selectedSpecs: sel, totalPrice: food.price });
  },

  selectSpec: function (e) {
    var name = e.currentTarget.dataset.spec;
    var val = e.currentTarget.dataset.value;
    var sel = {};
    for (var k in this.data.selectedSpecs) sel[k] = this.data.selectedSpecs[k];
    sel[name] = val;
    this.setData({ selectedSpecs: sel });
    this.calcTotalPrice();
  },

  calcTotalPrice: function () {
    var price = this.data.food.price;
    var sel = this.data.selectedSpecs;
    for (var k in sel) {
      var m = sel[k].match(/\+¥(\d+)/);
      if (m) price += parseInt(m[1]);
    }
    this.setData({ totalPrice: price * this.data.quantity });
  },

  decreaseQty: function () {
    if (this.data.quantity <= 1) return;
    this.setData({ quantity: this.data.quantity - 1 });
    this.calcTotalPrice();
  },

  increaseQty: function () {
    this.setData({ quantity: this.data.quantity + 1 });
    this.calcTotalPrice();
  },

  addToCart: function () {
    var food = this.data.food;
    var specs = [], keys = [];
    var sel = this.data.selectedSpecs;
    for (var k in sel) { specs.push({ name: k, value: sel[k] }); keys.push(k + ':' + sel[k]); }
    var specKey = keys.join('|');
    var cart = storage.getCart();
    var idx = -1;
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === food.id && (cart[i].specKey || '') === specKey) { idx = i; break; }
    }
    if (idx > -1) { cart[idx].quantity += this.data.quantity; }
    else { cart.push({ id: food.id, name: food.name, icon: food.icon, price: this.data.totalPrice / this.data.quantity, specs: specs, specKey: specKey, quantity: this.data.quantity }); }
    storage.setCart(cart);
    wx.showToast({ title: '已加入购物车', icon: 'success' });
  },

  buyNow: function () { this.addToCart(); wx.switchTab({ url: '/pages/cart/cart' }); },
  goCart: function () { wx.switchTab({ url: '/pages/cart/cart' }); },
});
