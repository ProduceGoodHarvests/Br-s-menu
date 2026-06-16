var storage = require('../../utils/storage');
var api = require('../../utils/cloud-api');
var format = require('../../utils/format');

Page({
  data: {
    items: [],
    totalPrice: '0.00',
    tableIndex: 0,
    tables: [
      { id: 1, name: 'A01 桌', area: '大厅' },
      { id: 2, name: 'A02 桌', area: '大厅' },
      { id: 3, name: 'B01 桌', area: '靠窗' },
      { id: 4, name: 'C01 包间', area: '包间' },
    ],
    remark: '',
    submitting: false,
  },

  onLoad: function () {
    this.loadCheckout();
  },

  loadCheckout: function () {
    var checkout = storage.getCheckout();

    if (!checkout.length) {
      wx.showToast({ title: '没有待结算菜品', icon: 'none' });
      setTimeout(function () {
        wx.switchTab({ url: '/pages/cart/cart' });
      }, 600);
      return;
    }

    var list = [];
    var total = 0;

    for (var i = 0; i < checkout.length; i++) {
      var item = checkout[i];
      var subtotal = Number(item.price || 0) * Number(item.quantity || 1);
      total += subtotal;
      list.push({
        id: item.id,
        name: item.name,
        icon: item.icon,
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 1),
        specs: item.specs || [],
        specKey: item.specKey || '',
        subtotal: format.formatMoney(subtotal),
      });
    }

    this.setData({
      items: list,
      totalPrice: format.formatMoney(total),
    });
  },

  selectTable: function (e) {
    this.setData({ tableIndex: Number(e.currentTarget.dataset.index || 0) });
  },

  onRemarkInput: function (e) {
    this.setData({ remark: e.detail.value || '' });
  },

  submitOrder: function () {
    if (this.data.submitting) return;

    var that = this;
    var table = this.data.tables[this.data.tableIndex];
    var order = this.buildOrder(table);

    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中...' });

    storage.addOrder(order);
    this.removeCheckedCartItems();

    api.submitOrder(order).catch(function (err) {
      console.log('云端下单不可用，已保存到本地', err);
    }).finally(function () {
      wx.hideLoading();
      that.setData({ submitting: false });
      wx.showModal({
        title: '下单成功',
        content: '订单号：' + order.id + '\n桌号：' + order.table + '\n金额：¥' + order.totalPrice,
        showCancel: false,
        success: function () {
          wx.switchTab({ url: '/pages/orders/orders' });
        },
      });
    });
  },

  buildOrder: function (table) {
    var items = [];

    for (var i = 0; i < this.data.items.length; i++) {
      var item = this.data.items[i];
      items.push({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        specs: item.specs,
        specKey: item.specKey,
        subtotal: item.subtotal,
      });
    }

    return {
      id: 'ORD' + Date.now(),
      table: table.name + ' ' + table.area,
      items: items,
      totalPrice: this.data.totalPrice,
      remark: this.data.remark,
      status: 'pending',
      createTime: format.formatDateTime(new Date()),
    };
  },

  removeCheckedCartItems: function () {
    var cart = storage.getCart();
    var selected = this.data.items;
    var kept = [];

    for (var i = 0; i < cart.length; i++) {
      var hit = false;

      for (var j = 0; j < selected.length; j++) {
        if (
          String(cart[i].id) === String(selected[j].id) &&
          (cart[i].specKey || '') === (selected[j].specKey || '')
        ) {
          hit = true;
          break;
        }
      }

      if (!hit) kept.push(cart[i]);
    }

    storage.setCart(kept);
    storage.clearCheckout();

    var app = getApp();
    if (app && app.updateCartCount) app.updateCartCount();
  },
});
