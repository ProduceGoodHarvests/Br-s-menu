var api = require('../../utils/cloud-api');
var format = require('../../utils/format');

var STATUS_TEXT = { pending_payment: '待支付', paid: '已支付', accepted: '已接单', cooking: '制作中', ready: '待取餐', completed: '已完成', cancelled: '已取消', rejected: '拒绝出餐', expired: '已失效' };
var TYPE_TEXT = { dine_in: '堂食', takeaway: '打包', pickup: '自提' };
var STATUS_CLASS = { pending_payment: 'pending', paid: 'paid', accepted: 'accepted', cooking: 'cooking', ready: 'ready', completed: 'completed', cancelled: 'cancelled', rejected: 'cancelled', expired: 'cancelled' };
var TYPE_ICON = { dine_in: '堂', takeaway: '包', pickup: '取' };

function normalize(order) {
  var coinUsed = Number(order.coinUsed || 0);
  var payPrice = Number(order.payPrice || 0);
  order.statusText = STATUS_TEXT[order.orderStatus] || order.orderStatus;
  order.statusClass = STATUS_CLASS[order.orderStatus] || 'pending';
  order.typeText = TYPE_TEXT[order.type] || order.type;
  order.typeIcon = TYPE_ICON[order.type] || '单';
  order.timeText = format.formatDateTime(order.createTime);
  order.coinUsedText = coinUsed.toFixed(2);
  order.payPriceText = payPrice.toFixed(2);
  order.totalPriceText = Number(order.totalPrice || 0).toFixed(2);
  order.originalTotalPriceText = Number(order.originalTotalPrice || order.totalPrice || 0).toFixed(2);
  order.discountAmountText = Number(order.discountAmount || 0).toFixed(2);
  order.memberDiscountText = order.memberDiscountText || '会员优惠';
  order.hasCoinPayment = coinUsed > 0;
  order.isCoinOnly = order.paymentMethod === 'coins' || (coinUsed > 0 && payPrice <= 0);
  order.goodsCount = (order.goodsList || []).reduce(function (total, goods) { return total + Number(goods.quantity || 0); }, 0);
  return order;
}

Page({
  data: { loading: true, summary: {}, orders: [], store: { isOpen: true, pauseReason: '' }, storeUpdating: false, typeFilter: '', statusFilter: '', types: [{ value: '', label: '全部场景' }, { value: 'dine_in', label: '堂食' }, { value: 'takeaway', label: '打包' }, { value: 'pickup', label: '自提' }], statuses: [{ value: '', label: '全部状态' }, { value: 'paid', label: '已支付' }, { value: 'cooking', label: '制作中' }, { value: 'ready', label: '待取餐' }, { value: 'rejected', label: '拒绝出餐' }, { value: 'completed', label: '已完成' }] },

  onShow: function () {
    if (this.timer) clearInterval(this.timer);
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
    Promise.all([api.adminDashboard(), api.adminOrders({ pageSize: 50, type: this.data.typeFilter, orderStatus: this.data.statusFilter }), api.getAppConfig()]).then(function (results) {
      var orders = [];
      for (var i = 0; i < (results[1].orders || []).length; i++) orders.push(normalize(results[1].orders[i]));
      that.setData({ summary: results[0].summary || {}, orders: orders, store: results[2].store || { isOpen: true, pauseReason: '' }, loading: false });
    }).catch(function (err) {
      if (!silent) wx.showToast({ title: err.msg || '后台加载失败', icon: 'none' });
      that.setData({ loading: false });
    });
  },

  onTypeFilter: function (e) { this.setData({ typeFilter: this.data.types[Number(e.detail.value)].value }); this.loadData(); },
  onStatusFilter: function (e) { this.setData({ statusFilter: this.data.statuses[Number(e.detail.value)].value }); this.loadData(); },

  toggleStoreStatus: function () {
    var that = this;
    if (this.data.storeUpdating) return;
    var isOpen = !(this.data.store && this.data.store.isOpen);
    wx.showModal({
      title: isOpen ? '恢复营业' : '暂停营业',
      content: isOpen ? '恢复后，用户可以立即正常点餐和下单。' : '暂停后将不再接收新订单；已创建的订单仍可正常处理。',
      confirmText: isOpen ? '恢复营业' : '确认暂停',
      confirmColor: isOpen ? '#ee5b2b' : '#59635f',
      success: function (res) {
        if (!res.confirm) return;
        that.setData({ storeUpdating: true });
        api.adminUpdateStoreStatus(isOpen, isOpen ? '' : '商家临时休息，请稍后再来').then(function (result) {
          that.setData({ store: result.store || { isOpen: isOpen, pauseReason: '' }, storeUpdating: false });
          wx.showToast({ title: isOpen ? '已恢复营业' : '已暂停营业', icon: 'success' });
        }).catch(function (err) {
          that.setData({ storeUpdating: false });
          wx.showModal({ title: '更新失败', content: err.msg || '营业状态更新失败，请稍后重试', showCancel: false });
        });
      }
    });
  },

  rejectOrder: function (e) {
    var that = this;
    var orderId = e.currentTarget.dataset.id;
    if (!orderId) return;
    wx.showModal({
      title: '拒绝出餐',
      content: '确认拒绝该订单出餐吗？订单会终止，菜品库存和已扣虚拟金币将自动退回用户。',
      confirmText: '确认拒绝',
      confirmColor: '#d84a3a',
      success: function (res) {
        if (!res.confirm) return;
        api.adminRejectOrder(orderId, '商家拒绝出餐').then(function () {
          if (wx.vibrateShort) wx.vibrateShort({ type: 'medium' });
          wx.showToast({ title: '已拒绝出餐', icon: 'success' });
          that.loadData();
        }).catch(function (err) {
          wx.showModal({ title: '操作失败', content: err.msg || '拒绝出餐失败，请刷新后重试', showCancel: false });
        });
      }
    });
  },

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
      var cancelContent = Number(e.currentTarget.dataset.coin || 0) > 0 ? '取消后会释放库存、桌台并自动返还用户金币，确定继续吗？' : '取消后会释放库存和桌台，确定继续吗？';
      wx.showModal({ title: labels[status], content: status === 'completed' ? '确认顾客已经取餐或用餐完成吗？' : cancelContent, confirmColor: '#ee5b2b', success: function (res) { if (res.confirm) execute(); } });
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
  goUsers: function () { wx.navigateTo({ url: '/pages/user-manager/user-manager' }); },
});
