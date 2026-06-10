// pages/orders/orders.js
var storage = require('../../utils/storage');

Page({
  data: {
    orders: [],
    activeTab: 0,
    tabs: ['全部', '待接单', '已完成'],
    isEmpty: true,
    isMerchant: false,
  },

  onShow: function () {
    var app = getApp();
    this.setData({ isMerchant: app.getRole() === 'merchant' });
    this.loadOrders();
  },

  loadOrders: function () {
    var orders = storage.getOrders();
    this.setData({ orders: orders, isEmpty: orders.length === 0 });
    this.doFilter();
  },

  onTabTap: function (e) {
    var idx = parseInt(e.currentTarget.dataset.index);
    this.setData({ activeTab: idx });
    this.doFilter();
  },

  doFilter: function () {
    var all = storage.getOrders();
    var tab = this.data.activeTab;
    var filtered = all;
    if (tab == 1) {
      filtered = [];
      for (var i = 0; i < all.length; i++) {
        if (all[i].status === 'pending') filtered.push(all[i]);
      }
    } else if (tab == 2) {
      filtered = [];
      for (var i = 0; i < all.length; i++) {
        if (all[i].status === 'completed') filtered.push(all[i]);
      }
    }
    this.setData({ orders: filtered, isEmpty: filtered.length === 0 });
  },

  // 商家：确认接单
  confirmOrder: function (e) {
    var that = this;
    var orderId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认接单',
      content: '确定接单并开始制作吗？',
      success: function (res) {
        if (res.confirm) {
          storage.updateOrderStatus(orderId, 'confirmed');
          wx.showToast({ title: '已接单', icon: 'success' });
          that.loadOrders();
        }
      },
    });
  },

  // 商家：完成订单
  completeOrder: function (e) {
    var that = this;
    var orderId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '完成订单',
      content: '确定该订单已完成制作吗？',
      success: function (res) {
        if (res.confirm) {
          storage.updateOrderStatus(orderId, 'completed');
          wx.showToast({ title: '已完成', icon: 'success' });
          that.loadOrders();
        }
      },
    });
  },

  // 查看详情
  showDetail: function (e) {
    var idx = parseInt(e.currentTarget.dataset.index);
    var order = this.data.orders[idx];
    if (!order) return;
    var lines = [];
    for (var i = 0; i < order.items.length; i++) {
      var it = order.items[i];
      lines.push(it.name + ' x' + it.quantity + ' ¥' + it.subtotal);
    }
    var statusMap = { pending: '待接单', confirmed: '制作中', completed: '已完成' };
    var content = '桌号：' + order.table +
      '\n时间：' + order.createTime +
      '\n状态：' + (statusMap[order.status] || order.status) +
      '\n\n' + lines.join('\n') +
      '\n\n合计：¥' + order.totalPrice;
    if (order.remark) content += '\n备注：' + order.remark;
    wx.showModal({
      title: '订单 ' + order.id,
      content: content,
      showCancel: false,
      confirmText: '关闭',
    });
  },

  onPullDownRefresh: function () {
    this.loadOrders();
    wx.stopPullDownRefresh();
  },
});
