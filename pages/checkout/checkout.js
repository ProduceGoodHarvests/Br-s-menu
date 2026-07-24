var api = require('../../utils/cloud-api');
var storage = require('../../utils/storage');

Page({
  data: {
    items: [], quote: null, tables: [], type: 'dine_in', tableNo: '', remark: '', submitting: false, loading: true, subscribeTemplateIds: [],
    types: [{ value: 'dine_in', label: '堂食' }, { value: 'takeaway', label: '打包带走' }, { value: 'pickup', label: '到店自提' }],
  },

  onLoad: function () {
    var items = storage.getCheckout();
    var context = storage.getOrderContext();
    if (!items.length) return wx.navigateBack();
    this.setData({ items: items, type: context.type, tableNo: context.tableNo });
    this.loadData();
    var that = this;
    api.getAppConfig().then(function (result) { that.setData({ subscribeTemplateIds: result.subscribeTemplateIds || [] }); }).catch(function () {});
  },

  loadData: function () {
    var that = this;
    Promise.all([api.quoteOrder(storage.toGoodsList(this.data.items)), api.getTables()]).then(function (results) {
      var tables = results[1].tables || [];
      var tableNo = that.data.tableNo;
      if (!tableNo && tables[0]) tableNo = tables[0].tableNo;
      that.setData({ quote: results[0], tables: tables, tableNo: tableNo, loading: false });
    }).catch(function (err) {
      that.setData({ loading: false });
      wx.showModal({ title: '结算失败', content: err.msg || '订单校验失败', showCancel: false });
    });
  },

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
    this.setData({ submitting: true });
    wx.showLoading({ title: '正在下单' });
    api.createOrder({
      type: this.data.type,
      tableNo: this.data.type === 'dine_in' ? this.data.tableNo : '',
      remark: this.data.remark,
      goodsList: storage.toGoodsList(this.data.items),
    }).then(function (order) {
      storage.clearCart();
      storage.clearCheckout();
      getApp().updateCartCount();
      return that.startPayment(order);
    }).catch(function (err) {
      wx.showModal({ title: '下单失败', content: err.msg || '请稍后重试', showCancel: false });
    }).finally(function () {
      wx.hideLoading();
      that.setData({ submitting: false });
    });
  },

  startPayment: function (order) {
    return api.getPayParams(order.orderId).then(function (result) {
      return new Promise(function (resolve) {
        wx.requestPayment(Object.assign({}, result.payment, {
          success: function () {
            wx.showToast({ title: '支付成功', icon: 'success' });
            setTimeout(function () { wx.switchTab({ url: '/pages/orders/orders' }); }, 500);
            resolve();
          },
          fail: function () {
            wx.showModal({ title: '订单已创建', content: '支付未完成，可在“订单”中继续支付。\n订单号：' + order.orderNo, showCancel: false, success: function () { wx.switchTab({ url: '/pages/orders/orders' }); } });
            resolve();
          },
        }));
      });
    }).catch(function (err) {
      wx.showModal({ title: '订单已创建', content: (err.msg || '暂时无法发起支付') + '\n可在订单列表继续支付。', showCancel: false, success: function () { wx.switchTab({ url: '/pages/orders/orders' }); } });
    });
  },
});
