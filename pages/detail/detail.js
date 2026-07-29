var api = require('../../utils/cloud-api');
var storage = require('../../utils/storage');
var menu = require('../../utils/menu');

Page({
  data: { themeClass: getApp().getThemeClass(), loading: true, dish: null, selections: {}, quantity: 1, unitPrice: '0.00', pricing: false, addedToCart: false },

  onShow: function () {
    getApp().syncPageTheme(this);
  },

  onLoad: function (options) {
    this.goodsId = options.id || '';
    this.loadDish();
  },

  loadDish: function () {
    var that = this;
    api.getDish(this.goodsId).then(function (result) {
      var dish = menu.normalizeDish(result.dish);
      that.setData({ dish: dish, selections: menu.defaultSelections(dish), loading: false });
      that.refreshPrice();
    }).catch(function (err) {
      wx.showModal({ title: '加载失败', content: err.msg || '菜品不存在', showCancel: false, success: function () { wx.navigateBack(); } });
    });
  },

  selectOption: function (e) {
    var selections = this.data.selections;
    selections[e.currentTarget.dataset.group] = e.currentTarget.dataset.value;
    this.setData({ selections: selections, addedToCart: false });
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' });
    this.refreshPrice();
  },

  refreshPrice: function () {
    var that = this;
    if (!this.data.dish) return;
    var requestId = (this.priceRequestId || 0) + 1;
    this.priceRequestId = requestId;
    this.setData({ pricing: true });
    api.quoteOrder([{ goodsId: this.data.dish._id, quantity: 1, specSelections: this.data.selections }]).then(function (result) {
      if (requestId !== that.priceRequestId) return;
      if (result.goodsList && result.goodsList[0]) that.setData({ unitPrice: Number(result.goodsList[0].price).toFixed(2), pricing: false });
    }).catch(function (err) {
      if (requestId !== that.priceRequestId) return;
      that.setData({ pricing: false });
      wx.showToast({ title: err.msg || '规格校验失败', icon: 'none' });
    });
  },

  changeQuantity: function (e) {
    var next = this.data.quantity + Number(e.currentTarget.dataset.delta || 0);
    if (next < 1) return wx.showToast({ title: '至少选择 1 份', icon: 'none' });
    if (next > 99) return wx.showToast({ title: '单次最多选择 99 份', icon: 'none' });
    if (this.data.dish && next > this.data.dish.stock) return wx.showToast({ title: '当前库存不足', icon: 'none' });
    this.setData({ quantity: next, addedToCart: false });
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' });
  },

  addToCart: function () {
    if (!this.data.dish || this.data.dish.stock <= 0) return wx.showToast({ title: '该菜品暂时售罄', icon: 'none' });
    storage.addCartItem(this.data.dish, this.data.quantity, this.data.selections);
    getApp().updateCartCount();
    if (wx.vibrateShort) wx.vibrateShort({ type: 'medium' });
    this.setData({ addedToCart: true });
    wx.showToast({ title: '已加入餐篮', icon: 'success' });
  },

  goCart: function () { wx.switchTab({ url: '/pages/cart/cart' }); },

  onUnload: function () { this.priceRequestId = (this.priceRequestId || 0) + 1; },
});
