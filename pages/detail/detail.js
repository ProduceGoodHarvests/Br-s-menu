var api = require('../../utils/cloud-api');
var storage = require('../../utils/storage');
var menu = require('../../utils/menu');

Page({
  data: { loading: true, dish: null, selections: {}, quantity: 1, unitPrice: '0.00' },

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
    this.setData({ selections: selections });
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' });
    this.refreshPrice();
  },

  refreshPrice: function () {
    var that = this;
    if (!this.data.dish) return;
    api.quoteOrder([{ goodsId: this.data.dish._id, quantity: 1, specSelections: this.data.selections }]).then(function (result) {
      if (result.goodsList && result.goodsList[0]) that.setData({ unitPrice: Number(result.goodsList[0].price).toFixed(2) });
    }).catch(function (err) {
      wx.showToast({ title: err.msg || '规格校验失败', icon: 'none' });
    });
  },

  changeQuantity: function (e) {
    var next = this.data.quantity + Number(e.currentTarget.dataset.delta || 0);
    if (next < 1 || next > 99 || (this.data.dish && next > this.data.dish.stock)) return;
    this.setData({ quantity: next });
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' });
  },

  addToCart: function () {
    if (!this.data.dish || this.data.dish.stock <= 0) return;
    storage.addCartItem(this.data.dish, this.data.quantity, this.data.selections);
    getApp().updateCartCount();
    if (wx.vibrateShort) wx.vibrateShort({ type: 'medium' });
    wx.showToast({ title: '已加入购物车', icon: 'success' });
  },
});
