var api = require('../../utils/cloud-api');
var storage = require('../../utils/storage');
var format = require('../../utils/format');

var STATUS_TEXT = { pending_payment: '待支付', paid: '已支付', accepted: '已接单', cooking: '制作中', ready: '待取餐', completed: '已完成', cancelled: '已取消', expired: '已失效' };
var TYPE_TEXT = { dine_in: '堂食', takeaway: '打包带走', pickup: '到店自提' };

function normalize(order) {
  order = order || {};
  var coinUsed = Number(order.coinUsed || 0);
  var payPrice = Number(order.payPrice || 0);
  order.statusText = STATUS_TEXT[order.orderStatus] || order.orderStatus || '订单处理中';
  order.typeText = TYPE_TEXT[order.type] || order.type || '到店用餐';
  order.createTimeText = format.formatDateTime(order.createTime);
  order.updateTimeText = format.formatDateTime(order.updateTime);
  order.totalPriceText = Number(order.totalPrice || 0).toFixed(2);
  order.payPriceText = payPrice.toFixed(2);
  order.coinUsedText = coinUsed.toFixed(2);
  order.hasCoinPayment = coinUsed > 0;
  order.isCoinOnly = order.paymentMethod === 'coins' || (coinUsed > 0 && payPrice <= 0);
  order.canReorder = ['paid', 'accepted', 'cooking', 'ready', 'completed'].indexOf(order.orderStatus) >= 0;
  order.progress = { paid: 1, accepted: 2, cooking: 3, ready: 4, completed: 5 }[order.orderStatus] || 0;
  order.statusClass = order.orderStatus === 'completed' ? 'completed' :
    order.orderStatus === 'cancelled' || order.orderStatus === 'expired' ? 'cancelled' :
    order.orderStatus === 'pending_payment' ? 'pending' : 'active';
  order.goodsCount = (order.goodsList || []).reduce(function (total, goods) { return total + Number(goods.quantity || 0); }, 0);
  return order;
}

Page({
  data: { loading: true, error: '', order: null },

  onLoad: function (options) {
    this.orderId = options.id || '';
    if (!this.orderId) return this.failAndBack();
    this.loadOrder();
  },

  onShow: function () {
    if (!this.orderId || this.data.loading) return;
    this.loadOrder(true);
    this.startRefresh();
  },

  onHide: function () { this.stopRefresh(); },
  onUnload: function () { this.stopRefresh(); this.requestId = (this.requestId || 0) + 1; },

  startRefresh: function () {
    this.stopRefresh();
    var that = this;
    this.timer = setInterval(function () {
      if (that.data.order && that.data.order.progress > 0 && that.data.order.progress < 5) that.loadOrder(true);
    }, 8000);
  },

  stopRefresh: function () {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  },

  loadOrder: function (silent) {
    var that = this;
    var requestId = (this.requestId || 0) + 1;
    this.requestId = requestId;
    if (!silent) this.setData({ loading: true, error: '' });
    return api.getOrder(this.orderId).then(function (result) {
      if (requestId !== that.requestId) return;
      that.setData({ order: normalize(result.order), loading: false, error: '' });
      that.startRefresh();
    }).catch(function (err) {
      if (requestId !== that.requestId) return;
      that.setData({ loading: false, error: err.msg || '订单详情加载失败，请稍后重试' });
    });
  },

  retryLoad: function () { this.loadOrder(); },
  onPullDownRefresh: function () { this.loadOrder().finally(function () { wx.stopPullDownRefresh(); }); },

  reorder: function () {
    var order = this.data.order;
    if (!order || !order.canReorder) return;
    for (var i = 0; i < (order.goodsList || []).length; i++) {
      var line = order.goodsList[i];
      var selections = {};
      for (var j = 0; j < (line.specs || []).length; j++) selections[line.specs[j].name] = line.specs[j].value;
      storage.addCartItem({ _id: line.goodsId, name: line.name, img: line.img, price: line.price }, line.quantity, selections);
    }
    getApp().updateCartCount();
    if (wx.vibrateShort) wx.vibrateShort({ type: 'medium' });
    wx.showToast({ title: '已加入餐篮', icon: 'success' });
    wx.switchTab({ url: '/pages/cart/cart' });
  },

  failAndBack: function () {
    wx.showToast({ title: '订单信息不完整', icon: 'none' });
    setTimeout(function () { wx.navigateBack(); }, 400);
  },
});
