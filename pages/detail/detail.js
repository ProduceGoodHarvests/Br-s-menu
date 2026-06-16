var menu = require('../../utils/menu');
var storage = require('../../utils/storage');
var format = require('../../utils/format');

function normalizeSpecs(specs) {
  var raw = specs || [];
  var result = [];

  for (var i = 0; i < raw.length; i++) {
    result.push({
      name: raw[i].n || raw[i].name,
      options: raw[i].o || raw[i].options || [],
    });
  }

  return result;
}

function categoryName(categoryId) {
  var cats = menu.getCategories(false);
  for (var i = 0; i < cats.length; i++) {
    if (Number(cats[i].id) === Number(categoryId)) return cats[i].name;
  }
  return '';
}

Page({
  data: {
    food: null,
    quantity: 1,
    selectedSpecs: {},
    selectedSpecList: [],
    unitPrice: 0,
    totalPrice: '0.00',
  },

  onLoad: function (options) {
    var raw = menu.getDishById(options.id);
    if (!raw) {
      wx.showToast({ title: '菜品不存在', icon: 'none' });
      return;
    }

    var food = menu.normalizeDish(raw);
    food.specs = normalizeSpecs(food.specs);
    food.categoryName = categoryName(food.categoryId);

    var selected = {};
    for (var i = 0; i < food.specs.length; i++) {
      selected[food.specs[i].name] = food.specs[i].options[0];
    }

    this.setData({
      food: food,
      selectedSpecs: selected,
      selectedSpecList: this.buildSpecList(selected),
    });
    this.calcPrice();
  },

  buildSpecList: function (selected) {
    var list = [];
    for (var key in selected) {
      if (selected.hasOwnProperty(key)) {
        list.push({ name: key, value: selected[key] });
      }
    }
    return list;
  },

  selectSpec: function (e) {
    var name = e.currentTarget.dataset.spec;
    var value = e.currentTarget.dataset.value;
    var selected = {};

    for (var key in this.data.selectedSpecs) {
      if (this.data.selectedSpecs.hasOwnProperty(key)) {
        selected[key] = this.data.selectedSpecs[key];
      }
    }

    selected[name] = value;

    this.setData({
      selectedSpecs: selected,
      selectedSpecList: this.buildSpecList(selected),
    });
    this.calcPrice();
  },

  calcPrice: function () {
    if (!this.data.food) return;

    var unitPrice = format.calcUnitPrice(this.data.food.price, this.data.selectedSpecList);
    var total = unitPrice * this.data.quantity;

    this.setData({
      unitPrice: unitPrice,
      totalPrice: format.formatMoney(total),
    });
  },

  decreaseQty: function () {
    if (this.data.quantity <= 1) return;
    this.setData({ quantity: this.data.quantity - 1 });
    this.calcPrice();
  },

  increaseQty: function () {
    this.setData({ quantity: this.data.quantity + 1 });
    this.calcPrice();
  },

  addToCart: function () {
    var food = this.data.food;
    if (!food) return false;

    var specs = format.normalizeSpecs(this.data.selectedSpecList);
    var specKey = format.buildSpecKey(specs);
    var cart = storage.getCart();
    var index = -1;

    for (var i = 0; i < cart.length; i++) {
      if (String(cart[i].id) === String(food.id) && (cart[i].specKey || '') === specKey) {
        index = i;
        break;
      }
    }

    if (index > -1) {
      cart[index].quantity += this.data.quantity;
    } else {
      cart.push({
        id: food.id,
        name: food.name,
        icon: food.icon,
        price: this.data.unitPrice,
        specs: specs,
        specKey: specKey,
        quantity: this.data.quantity,
      });
    }

    storage.setCart(cart);

    var app = getApp();
    if (app && app.updateCartCount) app.updateCartCount();

    wx.showToast({ title: '已加入购物车', icon: 'success' });
    return true;
  },

  buyNow: function () {
    if (this.addToCart()) {
      wx.switchTab({ url: '/pages/cart/cart' });
    }
  },

  goCart: function () {
    wx.switchTab({ url: '/pages/cart/cart' });
  },
});
