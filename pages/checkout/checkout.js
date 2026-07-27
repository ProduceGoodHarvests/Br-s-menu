var api = require('../../utils/cloud-api');
var storage = require('../../utils/storage');

Page({
  data: {
    items: [], quote: null, tables: [], type: 'dine_in', tableNo: '', remark: '', submitting: false, loading: true, error: '', store: { isOpen: true, pauseReason: '' }, subscribeTemplateIds: [],
    types: [{ value: 'dine_in', label: '堂食' }, { value: 'takeaway', label: '打包带走' }, { value: 'pickup', label: '到店自提' }],
  },

  onLoad: function () {
    var items = storage.getCheckout();
    var context = storage.getOrderContext();
    if (!items.length) return wx.navigateBack();
    this.setData({ items: items, type: context.type, tableNo: context.tableNo });
    this.loadData();
    var that = this;
    api.getAppConfig().then(function (result) { that.setData({ subscribeTemplateIds: result.subscribeTemplateIds || [], store: result.store || that.data.store }); }).catch(function () {});
  },

  loadData: function () {
    var that = this;
    var requestId = (this.loadRequestId || 0) + 1;
    this.loadRequestId = requestId;
    this.setData({ loading: true, error: '' });
    Promise.all([api.quoteOrder(storage.toGoodsList(this.data.items)), api.getTables()]).then(function (results) {
      if (requestId !== that.loadRequestId) return;
      var tables = results[1].tables || [];
      var tableNo = that.data.tableNo;
      if (!tableNo && tables[0]) tableNo = tables[0].tableNo;
      that.setData({ quote: results[0], tables: tables, tableNo: tableNo, store: results[0].store || that.data.store, loading: false });
    }).catch(function (err) {
      if (requestId !== that.loadRequestId) return;
      that.setData({ loading: false, quote: null, error: err.msg || '订单校验失败，请检查网络后重试' });
    });
  },

  retryLoadData: function () { this.loadData(); },

  selectType: function (e) {
    var type = e.currentTarget.dataset.type;
    this.setData({ type: type });
    storage.setOrderContext({ type: type, tableNo: this.data.tableNo });
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' });
  },

  selectTable: function (e) {
    var index = Number(e.detail.value);
    var table = this.data.tables[index];
    if (!table) return;
    this.setData({ tableNo: table.tableNo });
    storage.setOrderContext({ type: this.data.type, tableNo: table.tableNo });
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' });
  },

  onTableInput: function (e) {
    var tableNo = String(e.detail.value || '').trim().toUpperCase();
    this.setData({ tableNo: tableNo });
    storage.setOrderContext({ type: this.data.type, tableNo: tableNo });
  },

  onRemarkInput: function (e) { this.setData({ remark: e.detail.value || '' }); },

  submitOrder: function () {
    if (this.data.submitting || !this.data.quote) return;
    if (this.data.store && this.data.store.isOpen === false) return wx.showToast({ title: this.data.store.pauseReason || '门店暂停营业，请稍后再来', icon: 'none' });
    if (!this.data.quote.canPayWithCoins) return this.goRecharge();
    if (this.data.type === 'dine_in' && !this.data.tableNo) return wx.showToast({ title: '请选择或输入桌号', icon: 'none' });
    var that = this;
    if (this.data.subscribeTemplateIds.length && wx.requestSubscribeMessage) {
      wx.requestSubscribeMessage({ tmplIds: this.data.subscribeTemplateIds, complete: function () { that.createOrder(); } });
    } else {
      this.createOrder();
    }
  },

  createOrder: function () {
    var that = this;
    var clientRequestId = storage.getCheckoutRequestId();
    this.setData({ submitting: true });
    wx.showLoading({ title: '正在下单' });
    api.createOrder({
      type: this.data.type,
      tableNo: this.data.type === 'dine_in' ? this.data.tableNo : '',
      remark: this.data.remark,
      clientRequestId: clientRequestId,
      goodsList: storage.toGoodsList(this.data.items),
    }).then(function (order) {
      storage.clearCart();
      storage.clearCheckout();
      getApp().updateCartCount();
      return that.startPayment(order);
    }).catch(function (err) {
      if (err && err.code === 'STORE_CLOSED') {
        wx.showModal({ title: '门店暂停营业', content: err.msg || '商家暂不接收新订单，请稍后再来', confirmText: '返回点餐', success: function (res) { if (res.confirm) wx.navigateBack(); } });
        return;
      }
      if (err && err.code === 'INSUFFICIENT_COINS') {
        wx.showModal({
          title: '金币余额不足',
          content: err.msg || '请先到个人中心充值后再下单',
          confirmText: '去充值',
          success: function (res) { if (res.confirm) that.goRecharge(); }
        });
        return;
      }
      if (err && err.code === 'FUNCTION_TIMEOUT') {
        return that.resolveTimedOutOrder(clientRequestId, 0);
      }
      wx.showModal({ title: '下单失败', content: err.msg || '请稍后重试', showCancel: false });
    }).finally(function () {
      wx.hideLoading();
      that.setData({ submitting: false });
    });
  },

  resolveTimedOutOrder: function (clientRequestId, attempt) {
    var that = this;
    return api.resolveOrder(clientRequestId).then(function (result) {
      if (result && result.found) {
        storage.clearCart();
        storage.clearCheckout();
        getApp().updateCartCount();
        return that.startPayment(result);
      }
      if (attempt >= 3) {
        wx.showModal({
          title: '订单仍在处理中',
          content: '云端响应超时，但订单可能已经创建。请先到订单列表查看，不要重复提交。',
          confirmText: '查看订单',
          showCancel: false,
          success: function () { wx.switchTab({ url: '/pages/orders/orders' }); }
        });
        return;
      }
      return new Promise(function (resolve) {
        setTimeout(function () { resolve(that.resolveTimedOutOrder(clientRequestId, attempt + 1)); }, 700);
      });
    }).catch(function () {
      if (attempt >= 3) {
        wx.showModal({ title: '订单仍在处理中', content: '云端响应超时，请到订单列表确认是否已生成订单。', confirmText: '查看订单', showCancel: false, success: function () { wx.switchTab({ url: '/pages/orders/orders' }); } });
        return;
      }
      return new Promise(function (resolve) {
        setTimeout(function () { resolve(that.resolveTimedOutOrder(clientRequestId, attempt + 1)); }, 700);
      });
    });
  },

  goRecharge: function () {
    storage.requestRechargeOpen();
    wx.switchTab({ url: '/pages/mine/mine' });
  },

  startPayment: function (order) {
    if (order.paymentRequired === false) {
      return new Promise(function (resolve) {
        wx.showToast({ title: '金币支付成功', icon: 'success' });
        setTimeout(function () { wx.switchTab({ url: '/pages/orders/orders' }); resolve(); }, 600);
      });
    }
    return new Promise(function (resolve) {
      wx.showModal({
        title: '支付方式异常',
        content: '当前订单仅支持虚拟金币支付，请返回后重试。\n订单号：' + order.orderNo,
        showCancel: false,
        success: function () { wx.switchTab({ url: '/pages/orders/orders' }); resolve(); }
      });
    });
  },

  onUnload: function () { this.loadRequestId = (this.loadRequestId || 0) + 1; },
});
