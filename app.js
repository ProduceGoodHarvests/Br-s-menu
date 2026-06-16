var storage = require('./utils/storage');
var api = require('./utils/cloud-api');

App({
  globalData: {
    cartCount: 0,
  },

  onLaunch: function () {
    storage.seedDemoOrders();
    api.init();
    this.updateCartCount();
    console.log('点餐小程序启动，当前角色：', storage.getRole());
  },

  onShow: function () {
    this.updateCartCount();
  },

  getRole: function () {
    return storage.getRole();
  },

  switchRole: function (role) {
    storage.setRole(role);
  },

  updateCartCount: function () {
    var cart = storage.getCart();
    var count = 0;

    for (var i = 0; i < cart.length; i++) {
      count += cart[i].quantity || 0;
    }

    this.globalData.cartCount = count;

    if (typeof wx === 'undefined' || !wx.setTabBarBadge) return;

    if (count > 0) {
      wx.setTabBarBadge({
        index: 2,
        text: count > 99 ? '99+' : String(count),
      });
    } else if (wx.removeTabBarBadge) {
      wx.removeTabBarBadge({ index: 2 });
    }
  },
});
