var api = require('../../utils/cloud-api');
var storage = require('../../utils/storage');

Page({
  data: { themeClass: getApp().getThemeClass(), items: [], quote: null, quoting: false, error: '', itemCount: 0 },

  onShow: function () { getApp().syncPageTheme(this); this.loadCart(); },

  loadCart: function () {
    var items = storage.getCart();
    for (var i = 0; i < items.length; i++) {
      var keys = Object.keys(items[i].specSelections || {});
      var specs = [];
      for (var j = 0; j < keys.length; j++) specs.push(keys[j] + ':' + items[i].specSelections[keys[j]]);
      items[i].specText = specs.join(' / ');
    }
    this.setData({ items: items, itemCount: this.countItems(items) });
    this.refreshQuote();
  },

  countItems: function (items) {
    var count = 0;
    for (var i = 0; i < items.length; i++) count += Number(items[i].quantity || 0);
    return count;
  },

  refreshQuote: function () {
    var that = this;
    if (!this.data.items.length) {
      this.quoteRequestId = (this.quoteRequestId || 0) + 1;
      return this.setData({ quote: null, quoting: false, error: '' });
    }
    var requestId = (this.quoteRequestId || 0) + 1;
    this.quoteRequestId = requestId;
    var goodsList = storage.toGoodsList(this.data.items);
    this.setData({ quoting: true, error: '' });
    api.quoteOrder(goodsList).then(function (result) {
      if (requestId !== that.quoteRequestId) return;
      var items = that.data.items;
      for (var i = 0; i < items.length; i++) {
        if (result.goodsList[i]) {
          items[i].serverPrice = result.goodsList[i].price;
          items[i].serverSubtotal = result.goodsList[i].subtotal;
        }
      }
      that.setData({ quote: result, items: items, quoting: false });
    }).catch(function (err) {
      if (requestId !== that.quoteRequestId) return;
      that.setData({ quote: null, quoting: false, error: err.msg || '购物车校验失败' });
    });
  },

  changeQty: function (e) {
    var index = Number(e.currentTarget.dataset.index);
    var delta = Number(e.currentTarget.dataset.delta);
    var items = this.data.items;
    if (!items[index]) return;
    items[index].quantity += delta;
    if (items[index].quantity <= 0) items.splice(index, 1);
    storage.setCart(items);
    getApp().updateCartCount();
    this.setData({ items: items, itemCount: this.countItems(items) });
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' });
    this.scheduleQuote();
  },

  scheduleQuote: function () {
    var that = this;
    if (this.quoteTimer) clearTimeout(this.quoteTimer);
    this.quoteTimer = setTimeout(function () { that.refreshQuote(); }, 180);
  },

  removeItem: function (e) {
    var index = Number(e.currentTarget.dataset.index);
    var items = this.data.items;
    if (!items[index]) return;
    items.splice(index, 1);
    storage.setCart(items);
    getApp().updateCartCount();
    this.setData({ items: items, itemCount: this.countItems(items) });
    this.refreshQuote();
  },

  clearCart: function () {
    var that = this;
    wx.showModal({ title: '清空购物车', content: '确定移除全部菜品吗？', success: function (res) {
      if (!res.confirm) return;
      storage.clearCart();
      getApp().updateCartCount();
      that.loadCart();
    } });
  },

  checkout: function () {
    if (!this.data.quote || this.data.quoting) return wx.showToast({ title: this.data.error || '请等待价格校验', icon: 'none' });
    storage.setCheckout(this.data.items);
    wx.navigateTo({ url: '/pages/checkout/checkout' });
  },

  goMenu: function () { wx.switchTab({ url: '/pages/index/index' }); },

  onUnload: function () {
    if (this.quoteTimer) clearTimeout(this.quoteTimer);
    this.quoteRequestId = (this.quoteRequestId || 0) + 1;
  },
});
