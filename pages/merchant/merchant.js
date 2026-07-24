var api = require('../../utils/cloud-api');
var format = require('../../utils/format');

var STATUS_TEXT = { pending_payment: '待支付', paid: '已支付', accepted: '已接单', cooking: '制作中', ready: '待取餐', completed: '已完成', cancelled: '已取消', expired: '已失效' };
var TYPE_TEXT = { dine_in: '堂食', takeaway: '打包', pickup: '自提' };

function normalize(order) {
  order.statusText = STATUS_TEXT[order.orderStatus] || order.orderStatus;
  order.typeText = TYPE_TEXT[order.type] || order.type;
  order.timeText = format.formatDateTime(order.createTime);
  return order;
}

Page({
  data: { loading: true, summary: {}, orders: [], typeFilter: '', statusFilter: '', types: [{ value: '', label: '全部场景' }, { value: 'dine_in', label: '堂食' }, { value: 'takeaway', label: '打包' }, { value: 'pickup', label: '自提' }], statuses: [{ value: '', label: '全部状态' }, { value: 'paid', label: '已支付' }, { value: 'cooking', label: '制作中' }, { value: 'ready', label: '待取餐' }, { value: 'completed', label: '已完成' }] },

  onShow: function () {
    this.checkAndLoad();
    var that = this;
    this.timer = setInterval(function () { that.loadData(true); }, 8000);
  },
  onHide: function () { if (this.timer) clearInterval(this.timer); },
  onUnload: function () { if (this.timer) clearInterval(this.timer); },

  checkAndLoad: function () {
    var that = this;
    getApp().getSession().then(function (session) {
      if (!session.isAdmin) throw { msg: '无管理员权限' };
      that.loadData();
    }).catch(function (err) {
      wx.showModal({ title: '禁止访问', content: err.msg || '无管理员权限', showCancel: false, success: function () { wx.navigateBack(); } });
    });
  },

  loadData: function (silent) {
    var that = this;
    if (!silent) this.setData({ loading: true });
    Promise.all([api.adminDashboard(), api.adminOrders({ pageSize: 50, type: this.data.typeFilter, orderStatus: this.data.statusFilter })]).then(function (results) {
      var orders = [];
      for (var i = 0; i < (results[1].orders || []).length; i++) orders.push(normalize(results[1].orders[i]));
      that.setData({ summary: results[0].summary || {}, orders: orders, loading: false });
    }).catch(function (err) {
      if (!silent) wx.showToast({ title: err.msg || '后台加载失败', icon: 'none' });
      that.setData({ loading: false });
    });
  },

  onTypeFilter: function (e) { this.setData({ typeFilter: this.data.types[Number(e.detail.value)].value }); this.loadData(); },
  onStatusFilter: function (e) { this.setData({ statusFilter: this.data.statuses[Number(e.detail.value)].value }); this.loadData(); },

  updateStatus: function (e) {
    var that = this;
    var status = e.currentTarget.dataset.status;
    var orderId = e.currentTarget.dataset.id;
    var labels = { accepted: '确认接单', cooking: '开始制作', ready: '确认出餐', completed: '完成订单', cancelled: '取消未支付订单' };
    var execute = function () {
      api.adminUpdateOrder(orderId, status).then(function () {
        if (wx.vibrateShort) wx.vibrateShort({ type: 'medium' });
        wx.showToast({ title: '状态已更新', icon: 'success' });
        that.loadData();
      }).catch(function (err) { wx.showModal({ title: '更新失败', content: err.msg || '状态更新失败', showCancel: false }); });
    };
    if (status === 'completed' || status === 'cancelled') {
      wx.showModal({ title: labels[status], content: status === 'completed' ? '确认顾客已经取餐或用餐完成吗？' : '取消后会释放库存和桌台，确定继续吗？', confirmColor: '#ee5b2b', success: function (res) { if (res.confirm) execute(); } });
    } else {
      execute();
    }
  },

  reprint: function (e) {
    api.reprint(e.currentTarget.dataset.id).then(function () { wx.showToast({ title: '已提交补打', icon: 'success' }); }).catch(function (err) { wx.showModal({ title: '打印失败', content: err.msg || '补打失败', showCancel: false }); });
  },

  goDishes: function () { wx.navigateTo({ url: '/pages/add-dish/add-dish' }); },
  goData: function () { wx.navigateTo({ url: '/pages/data-manager/data-manager' }); },
  goAdmins: function () { wx.navigateTo({ url: '/pages/tag-manager/tag-manager' }); },
});
