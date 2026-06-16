var storage = require('../../utils/storage');
var api = require('../../utils/cloud-api');
var format = require('../../utils/format');

var STATUS_TEXT = {
  pending: '待接单',
  confirmed: '制作中',
  completed: '已完成',
};

function normalizeOrder(order) {
  return {
    id: order._id || order.id,
    table: order.table || '',
    items: order.items || [],
    totalPrice: order.totalPrice || '0.00',
    remark: order.remark || '',
    status: order.status || 'pending',
    statusText: STATUS_TEXT[order.status] || order.status || '待接单',
    createTime: format.formatDateTime(order.createTime),
  };
}

Page({
  data: {
    orders: [],
    tabs: [
      { label: '全部', value: 'all' },
      { label: '待处理', value: 'active' },
      { label: '已完成', value: 'completed' },
    ],
    activeTab: 'all',
    isEmpty: true,
    isMerchant: false,
  },

  onShow: function () {
    var app = getApp();
    this.setData({ isMerchant: app && app.getRole && app.getRole() === 'merchant' });
    this.loadOrders();
  },

  loadOrders: function () {
    var that = this;

    api.getOrders().then(function (res) {
      that.setAllOrders(res.orders || []);
    }).catch(function () {
      that.setAllOrders(storage.getOrders());
    });
  },

  setAllOrders: function (orders) {
    var list = [];

    for (var i = 0; i < orders.length; i++) {
      list.push(normalizeOrder(orders[i]));
    }

    this._allOrders = list;
    this.applyFilter();
  },

  onTabTap: function (e) {
    this.setData({ activeTab: e.currentTarget.dataset.value });
    this.applyFilter();
  },

  applyFilter: function () {
    var all = this._allOrders || [];
    var tab = this.data.activeTab;
    var filtered = [];

    for (var i = 0; i < all.length; i++) {
      if (tab === 'all') {
        filtered.push(all[i]);
      } else if (tab === 'active' && all[i].status !== 'completed') {
        filtered.push(all[i]);
      } else if (tab === 'completed' && all[i].status === 'completed') {
        filtered.push(all[i]);
      }
    }

    this.setData({
      orders: filtered,
      isEmpty: filtered.length === 0,
    });
  },

  updateStatus: function (orderId, status, toastTitle) {
    var that = this;

    api.updateOrderStatus(orderId, status).catch(function () {
      storage.updateOrderStatus(orderId, status);
    }).finally(function () {
      wx.showToast({ title: toastTitle, icon: 'success' });
      that.loadOrders();
    });
  },

  confirmOrder: function (e) {
    var that = this;
    var orderId = e.currentTarget.dataset.id;

    wx.showModal({
      title: '确认接单',
      content: '确认接单并开始制作吗？',
      success: function (res) {
        if (res.confirm) {
          that.updateStatus(orderId, 'confirmed', '已接单');
        }
      },
    });
  },

  completeOrder: function (e) {
    var that = this;
    var orderId = e.currentTarget.dataset.id;

    wx.showModal({
      title: '完成订单',
      content: '确认这笔订单已经完成吗？',
      success: function (res) {
        if (res.confirm) {
          that.updateStatus(orderId, 'completed', '已完成');
        }
      },
    });
  },

  showDetail: function (e) {
    var order = this.data.orders[Number(e.currentTarget.dataset.index)];
    if (!order) return;

    var lines = [];
    for (var i = 0; i < order.items.length; i++) {
      var item = order.items[i];
      lines.push(item.name + ' x' + item.quantity + '  ¥' + (item.subtotal || format.formatMoney(item.price * item.quantity)));
    }

    var content =
      '桌号：' +
      order.table +
      '\n时间：' +
      order.createTime +
      '\n状态：' +
      order.statusText +
      '\n\n' +
      lines.join('\n') +
      '\n\n合计：¥' +
      order.totalPrice;

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
