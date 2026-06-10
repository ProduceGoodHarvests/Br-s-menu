// pages/orders/orders.js
Page({
  data: {
    orders: [],
    activeTab: 0,
    tabs: ['全部', '待处理', '已完成'],
    isEmpty: true,
  },

  onShow: function () {
    this.loadOrders();
  },

  loadOrders: function () {
    let orders = wx.getStorageSync('orders') || [];
    if (!Array.isArray(orders)) orders = [];

    // 首次进入添加模拟历史订单
    if (orders.length === 0) {
      orders = [
        {
          id: 'ORD1718000000001',
          table: 'B02 桌 B区靠窗',
          items: [
            { name: '招牌红烧牛肉面', price: 32, quantity: 2, subtotal: '64.00', specs: [{ name: '份量', value: '大份' }] },
            { name: '柠檬气泡水', price: 10, quantity: 1, subtotal: '10.00', specs: [] },
          ],
          totalPrice: '74.00', remark: '', status: 'completed', createTime: '2026-06-09 12:30',
        },
        {
          id: 'ORD1718000000002',
          table: 'A01 桌 A区大厅',
          items: [
            { name: '麻辣小龙虾盖饭', price: 38, quantity: 1, subtotal: '38.00', specs: [{ name: '辣度', value: '中辣' }] },
            { name: '珍珠奶茶', price: 12, quantity: 2, subtotal: '24.00', specs: [{ name: '甜度', value: '半糖' }, { name: '温度', value: '加冰' }] },
          ],
          totalPrice: '62.00', remark: '少放盐', status: 'completed', createTime: '2026-06-08 18:45',
        },
      ];
      wx.setStorageSync('orders', orders);
    }

    this.setData({ orders: orders, isEmpty: orders.length === 0 });
    this.doFilter();
  },

  onTabTap: function (e) {
    var idx = parseInt(e.currentTarget.dataset.index);
    this.setData({ activeTab: idx });
    this.doFilter();
  },

  doFilter: function () {
    var all = wx.getStorageSync('orders') || [];
    if (!Array.isArray(all)) all = [];
    var tab = this.data.activeTab;
    var filtered = all;
    if (tab == 1) filtered = all.filter(function(o) { return o.status === 'pending'; });
    else if (tab == 2) filtered = all.filter(function(o) { return o.status === 'completed'; });
    this.setData({ orders: filtered, isEmpty: filtered.length === 0 });
  },

  // 查看订单详情
  showDetail: function (e) {
    var idx = parseInt(e.currentTarget.dataset.index);
    var order = this.data.orders[idx];
    if (!order) return;
    var lines = [];
    for (var i = 0; i < order.items.length; i++) {
      var it = order.items[i];
      lines.push(it.name + ' x' + it.quantity + ' ¥' + it.subtotal);
    }
    var statusText = order.status === 'completed' ? '已完成' : '处理中';
    var content = '桌号：' + order.table + '\n时间：' + order.createTime + '\n状态：' + statusText + '\n\n' + lines.join('\n') + '\n\n合计：¥' + order.totalPrice;
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
