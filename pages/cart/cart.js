var storage = require('../../utils/storage');
var format = require('../../utils/format');

function toCartItem(item) {
  return {
    id: item.id,
    name: item.name,
    icon: item.icon,
    price: Number(item.price || 0),
    priceText: format.formatMoney(item.price || 0),
    specs: item.specs || [],
    specKey: item.specKey || '',
    quantity: Number(item.quantity || 1),
    checked: item.checked !== false,
  };
}

Page({
  data: {
    cartItems: [],
    totalPrice: '0.00',
    allChecked: true,
    isEmpty: true,
    checkedCount: 0,
  },

  onShow: function () {
    this.loadCart();
  },

  loadCart: function () {
    var cart = storage.getCart();
    var items = [];

    for (var i = 0; i < cart.length; i++) {
      items.push(toCartItem(cart[i]));
    }

    this.setData({
      cartItems: items,
      isEmpty: items.length === 0,
    });
    this.refreshSummary();
  },

  refreshSummary: function () {
    var items = this.data.cartItems;
    var total = 0;
    var checkedCount = 0;
    var allChecked = items.length > 0;

    for (var i = 0; i < items.length; i++) {
      if (items[i].checked) {
        checkedCount += items[i].quantity;
        total += items[i].price * items[i].quantity;
      } else {
        allChecked = false;
      }
    }

    this.setData({
      totalPrice: format.formatMoney(total),
      checkedCount: checkedCount,
      allChecked: allChecked,
      isEmpty: items.length === 0,
    });
  },

  toggleCheck: function (e) {
    var index = Number(e.currentTarget.dataset.index);
    var items = this.data.cartItems;
    if (!items[index]) return;

    items[index].checked = !items[index].checked;
    this.setData({ cartItems: items });
    this.refreshSummary();
  },

  toggleAll: function () {
    if (this.data.isEmpty) return;

    var next = !this.data.allChecked;
    var items = this.data.cartItems;

    for (var i = 0; i < items.length; i++) {
      items[i].checked = next;
    }

    this.setData({ cartItems: items });
    this.refreshSummary();
  },

  changeQty: function (e) {
    var index = Number(e.currentTarget.dataset.index);
    var action = e.currentTarget.dataset.action;
    var items = this.data.cartItems;

    if (!items[index]) return;

    if (action === 'minus') {
      if (items[index].quantity <= 1) return;
      items[index].quantity -= 1;
    } else {
      items[index].quantity += 1;
    }

    this.setData({ cartItems: items });
    this.saveCart();
    this.refreshSummary();
  },

  deleteItem: function (e) {
    var that = this;
    var index = Number(e.currentTarget.dataset.index);

    wx.showModal({
      title: '删除菜品',
      content: '确定从购物车移除这道菜吗？',
      success: function (res) {
        if (!res.confirm) return;

        var items = that.data.cartItems;
        items.splice(index, 1);
        that.setData({ cartItems: items });
        that.saveCart();
        that.refreshSummary();
      },
    });
  },

  saveCart: function () {
    var items = this.data.cartItems;
    var cart = [];

    for (var i = 0; i < items.length; i++) {
      cart.push({
        id: items[i].id,
        name: items[i].name,
        icon: items[i].icon,
        price: items[i].price,
        specs: items[i].specs,
        specKey: items[i].specKey,
        quantity: items[i].quantity,
      });
    }

    storage.setCart(cart);

    var app = getApp();
    if (app && app.updateCartCount) app.updateCartCount();
  },

  checkout: function () {
    var selected = [];
    var items = this.data.cartItems;

    for (var i = 0; i < items.length; i++) {
      if (items[i].checked) selected.push(items[i]);
    }

    if (selected.length === 0) {
      wx.showToast({ title: '请选择要结算的菜品', icon: 'none' });
      return;
    }

    storage.setCheckout(selected);
    wx.navigateTo({ url: '/pages/checkout/checkout' });
  },

  goOrder: function () {
    wx.switchTab({ url: '/pages/index/index' });
  },
});
