// app.js — 点餐小程序
var storage = require('./utils/storage');

App({
  onLaunch: function () {
    storage.ensureMenuVersion('four-dishes-2026-06-11');
    storage.seedDemoOrders();
    console.log('点餐小程序启动 —— 当前角色:', storage.getRole());
  },

  globalData: { cartCount: 0 },

  getRole: function () { return storage.getRole(); },
  switchRole: function (role) { storage.setRole(role); },

  updateCartCount: function () {
    var cart = storage.getCart();
    var count = 0;
    for (var i = 0; i < cart.length; i++) { count += cart[i].quantity; }
    this.globalData.cartCount = count;
    if (count > 0) {
      wx.setTabBarBadge({ index: 2, text: count > 99 ? '99+' : String(count) });
    } else {
      wx.removeTabBarBadge({ index: 2 });
    }
  },
});
