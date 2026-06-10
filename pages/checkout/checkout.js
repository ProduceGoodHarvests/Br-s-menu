// pages/checkout/checkout.js
var storage = require('../../utils/storage');

Page({
  data: {
    items: [],
    totalPrice: '0.00',
    tableIndex: 0,
    tables: [
      { id: 1, name: 'A01 桌', area: 'A区大厅' },
      { id: 2, name: 'A02 桌', area: 'A区大厅' },
      { id: 3, name: 'B01 桌', area: 'B区靠窗' },
      { id: 4, name: 'C01 包间', area: 'C区包间' },
    ],
    remark: '',
    submitting: false,
  },

  onLoad: function () {
    var items = storage.getCheckout();
    if (!Array.isArray(items)) items = [];
    var itemsWithSubtotal = [];
    var total = 0;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var st = (it.price * it.quantity).toFixed(2);
      itemsWithSubtotal.push({
        id: it.id, name: it.name, icon: it.icon,
        price: it.price, quantity: it.quantity,
        specs: it.specs || [], subtotal: st,
      });
      total += parseFloat(st);
    }
    this.setData({ items: itemsWithSubtotal, totalPrice: total.toFixed(2) });
  },

  selectTable: function (e) {
    var idx = parseInt(e.currentTarget.dataset.index);
    this.setData({ tableIndex: idx });
  },

  onRemarkInput: function (e) {
    this.setData({ remark: e.detail.value });
  },

  submitOrder: function () {
    if (this.data.submitting) return;
    var that = this;
    var table = this.data.tables[this.data.tableIndex];
    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中...' });

    setTimeout(function () {
      wx.hideLoading();
      var now = new Date();
      var time = now.getFullYear() + '-' +
        ('0' + (now.getMonth() + 1)).slice(-2) + '-' +
        ('0' + now.getDate()).slice(-2) + ' ' +
        ('0' + now.getHours()).slice(-2) + ':' +
        ('0' + now.getMinutes()).slice(-2);

      var orderItems = [];
      var dataItems = that.data.items;
      for (var i = 0; i < dataItems.length; i++) {
        var it = dataItems[i];
        orderItems.push({
          name: it.name, price: it.price,
          quantity: it.quantity, subtotal: it.subtotal,
          specs: it.specs || [],
        });
      }

      var order = {
        id: 'ORD' + Date.now(),
        table: table.name + ' ' + table.area,
        items: orderItems,
        totalPrice: that.data.totalPrice,
        remark: that.data.remark,
        status: 'pending',
        createTime: time,
      };

      storage.addOrder(order);

      // 清空购物车中已购买的商品
      var cart = storage.getCart();
      var checkoutIds = [];
      for (var j = 0; j < dataItems.length; j++) {
        checkoutIds.push(dataItems[j].id);
      }
      var newCart = [];
      for (var k = 0; k < cart.length; k++) {
        if (checkoutIds.indexOf(cart[k].id) === -1) newCart.push(cart[k]);
      }
      storage.setCart(newCart);
      storage.clearCheckout();
      that.setData({ submitting: false });

      wx.showModal({
        title: '下单成功',
        content: '订单号：' + order.id + '\n桌号：' + order.table + '\n金额：¥' + order.totalPrice,
        showCancel: false,
        success: function () {
          wx.switchTab({ url: '/pages/orders/orders' });
        },
      });
    }, 1500);
  },
});
