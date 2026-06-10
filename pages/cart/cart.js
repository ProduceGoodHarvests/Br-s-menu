// pages/cart/cart.js
var storage = require('../../utils/storage');

Page({
  data: { cartItems: [], totalPrice: 0, allChecked: true, isEmpty: true },

  onShow: function () { this.loadCart(); },

  loadCart: function () {
    var cart = storage.getCart();
    var items = [];
    for (var i = 0; i < cart.length; i++) {
      var it = cart[i];
      items.push({ id: it.id, name: it.name, icon: it.icon, price: it.price, specs: it.specs, specKey: it.specKey, quantity: it.quantity, checked: true });
    }
    this.setData({ cartItems: items, isEmpty: items.length === 0, allChecked: items.length > 0 });
    this.calcTotal();
  },

  calcTotal: function () {
    var items = this.data.cartItems;
    var total = 0;
    for (var i = 0; i < items.length; i++) {
      if (items[i].checked) total += items[i].price * items[i].quantity;
    }
    this.setData({ totalPrice: total.toFixed(2) });
  },

  toggleCheck: function (e) {
    var idx = parseInt(e.currentTarget.dataset.index);
    var items = this.data.cartItems;
    items[idx].checked = !items[idx].checked;
    var allChecked = true;
    for (var i = 0; i < items.length; i++) { if (!items[i].checked) { allChecked = false; break; } }
    this.setData({ cartItems: items, allChecked: allChecked });
    this.calcTotal();
  },

  toggleAll: function () {
    var allChecked = !this.data.allChecked;
    var items = this.data.cartItems;
    for (var i = 0; i < items.length; i++) { items[i].checked = allChecked; }
    this.setData({ cartItems: items, allChecked: allChecked });
    this.calcTotal();
  },

  changeQty: function (e) {
    var idx = parseInt(e.currentTarget.dataset.index);
    var action = e.currentTarget.dataset.action;
    var items = this.data.cartItems;
    if (action === 'minus') { if (items[idx].quantity <= 1) return; items[idx].quantity -= 1; }
    else { items[idx].quantity += 1; }
    this.setData({ cartItems: items });
    this.saveCart();
    this.calcTotal();
  },

  deleteItem: function (e) {
    var that = this;
    var idx = parseInt(e.currentTarget.dataset.index);
    wx.showModal({
      title: '提示', content: '确定要删除该商品吗？',
      success: function (res) {
        if (res.confirm) {
          var items = that.data.cartItems;
          items.splice(idx, 1);
          that.setData({ cartItems: items, isEmpty: items.length === 0 });
          that.saveCart();
          that.calcTotal();
        }
      },
    });
  },

  saveCart: function () {
    var items = this.data.cartItems;
    var cart = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      cart.push({ id: it.id, name: it.name, icon: it.icon, price: it.price, specs: it.specs, specKey: it.specKey, quantity: it.quantity });
    }
    storage.setCart(cart);
  },

  checkout: function () {
    var checked = [];
    var items = this.data.cartItems;
    for (var i = 0; i < items.length; i++) { if (items[i].checked) checked.push(items[i]); }
    if (checked.length === 0) { wx.showToast({ title: '请选择要结算的商品', icon: 'none' }); return; }
    storage.setCheckout(checked);
    wx.navigateTo({ url: '/pages/checkout/checkout' });
  },

  goOrder: function () { wx.switchTab({ url: '/pages/index/index' }); },
});
