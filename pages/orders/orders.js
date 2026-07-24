var api = require('../../utils/cloud-api');
var storage = require('../../utils/storage');
var format = require('../../utils/format');

var STATUS_TEXT = { pending_payment: '待支付', paid: '已支付', accepted: '已接单', cooking: '制作中', ready: '待取餐', completed: '已完成', cancelled: '已取消', expired: '已失效' };
var TYPE_TEXT = { dine_in: '堂食', takeaway: '打包带走', pickup: '到店自提' };

function normalize(order) {
  var coinUsed = Number(order.coinUsed || 0);
  var payPrice = Number(order.payPrice || 0);
  order.statusText = STATUS_TEXT[order.orderStatus] || order.orderStatus;
  order.typeText = TYPE_TEXT[order.type] || order.type;
  order.timeText = format.formatDateTime(order.createTime);
  order.canPay = order.orderStatus === 'pending_payment' && order.payStatus === 'unpaid';
  order.canCancel = order.canPay;
  order.canReorder = ['paid', 'accepted', 'cooking', 'ready', 'completed'].indexOf(order.orderStatus) >= 0;
  order.statusClass = order.orderStatus === 'completed' ? 'completed' :
    order.orderStatus === 'cancelled' || order.orderStatus === 'expired' ? 'muted-status' :
    order.orderStatus === 'pending_payment' ? 'payment' : 'active-status';
  order.progress = { paid: 1, accepted: 2, cooking: 3, ready: 4, completed: 5 }[order.orderStatus] || 0;
  order.sceneIcon = { dine_in: '🍽', takeaway: '🥡', pickup: '🛍' }[order.type] || '🍽';
  order.coinUsedText = coinUsed.toFixed(2);
  order.payPriceText = payPrice.toFixed(2);
  order.hasCoinPayment = coinUsed > 0;
  order.isCoinOnly = order.paymentMethod === 'coins' || (coinUsed > 0 && payPrice <= 0);
  order.isMixedPayment = order.paymentMethod === 'mixed' || (coinUsed > 0 && payPrice > 0);
  return order;
}

Page({
  data: { orders: [], visibleOrders: [], loading: true, activeTab: 'all', skeletons: [1, 2], tabs: [{ value: 'all', label: '全部' }, { value: 'active', label: '进行中' }, { value: 'completed', label: '已完成' }] },

  onShow: function () {
    this.loadOrders();
    var that = this;
    this.timer = setInterval(function () { that.loadOrders(true); }, 8000);
  },
  onHide: function () { if (this.timer) clearInterval(this.timer); },
  onUnload: function () { if (this.timer) clearInterval(this.timer); },

  loadOrders: function (silent) {
    var that = this;
    if (!silent) this.setData({ loading: true });
    api.getOrders({ pageSize: 50 }).then(function (result) {
      var list = [];
      for (var i = 0; i < (result.orders || []).length; i++) list.push(normalize(result.orders[i]));
      that.allOrders = list;
      that.applyFilter();
      that.setData({ loading: false });
    }).catch(function (err) {
      if (!silent) wx.showToast({ title: err.msg || '订单加载失败', icon: 'none' });
      that.setData({ loading: false });
    });
  },

  switchTab: function (e) { this.setData({ activeTab: e.currentTarget.dataset.value }); this.applyFilter(); },
  applyFilter: function () {
    var tab = this.data.activeTab;
    var list = (this.allOrders || []).filter(function (order) {
      if (tab === 'all') return true;
      if (tab === 'completed') return order.orderStatus === 'completed';
      return ['pending_payment', 'paid', 'accepted', 'cooking', 'ready'].indexOf(order.orderStatus) >= 0;
    });
    this.setData({ visibleOrders: list, orders: this.allOrders || [] });
  },

  cancelOrder: function (e) {
    var that = this;
    var hasCoins = Number(e.currentTarget.dataset.coin || 0) > 0;
    var content = hasCoins ? '取消后库存和已抵扣的虚拟金币会自动返还，确定继续吗？' : '取消后会立即释放库存，确定继续吗？';
    wx.showModal({ title: '取消订单', content: content, success: function (res) {
      if (!res.confirm) return;
      api.cancelOrder(e.currentTarget.dataset.id).then(function () { wx.showToast({ title: '已取消', icon: 'success' }); that.loadOrders(); }).catch(function (err) { wx.showToast({ title: err.msg || '取消失败', icon: 'none' }); });
    } });
  },

  payOrder: function (e) {
    var that = this;
    api.getPayParams(e.currentTarget.dataset.id).then(function (result) {
      wx.requestPayment(Object.assign({}, result.payment, { success: function () { wx.showToast({ title: '支付成功', icon: 'success' }); setTimeout(function () { that.loadOrders(); }, 800); }, fail: function () { wx.showToast({ title: '支付未完成', icon: 'none' }); } }));
    }).catch(function (err) { wx.showModal({ title: '无法支付', content: err.msg || '请稍后重试', showCancel: false }); });
  },

  reorder: function (e) {
    var order = null;
    for (var i = 0; i < this.data.orders.length; i++) if (this.data.orders[i]._id === e.currentTarget.dataset.id) order = this.data.orders[i];
    if (!order) return;
    var cart = storage.getCart();
    for (var j = 0; j < (order.goodsList || []).length; j++) {
      var line = order.goodsList[j];
      var selections = {};
      for (var k = 0; k < (line.specs || []).length; k++) selections[line.specs[k].name] = line.specs[k].value;
      storage.addCartItem({ _id: line.goodsId, name: line.name, img: line.img, price: line.price }, line.quantity, selections);
    }
    getApp().updateCartCount();
    if (wx.vibrateShort) wx.vibrateShort({ type: 'medium' });
    wx.switchTab({ url: '/pages/cart/cart' });
  },

  onPullDownRefresh: function () { this.loadOrders(); wx.stopPullDownRefresh(); },
});
