// app.js — 点餐小程序（纯本地模拟数据，无需服务端）

App({
  onLaunch: function () {
    // 初始化购物车（存储到本地缓存）
    const cart = wx.getStorageSync('cart');
    if (!cart || !Array.isArray(cart)) {
      wx.setStorageSync('cart', []);
    }

    // 初始化订单列表
    const orders = wx.getStorageSync('orders');
    if (!orders || !Array.isArray(orders)) {
      wx.setStorageSync('orders', []);
    }

    console.log('点餐小程序启动完成 —— 离线模拟模式');
  },

  // 全局购物车操作
  globalData: {
    cartCount: 0,
  },

  // 更新购物车数量
  updateCartCount: function () {
    const cart = wx.getStorageSync('cart') || [];
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    this.globalData.cartCount = count;
    // 更新tabBar角标
    if (count > 0) {
      wx.setTabBarBadge({
        index: 2,
        text: count > 99 ? '99+' : String(count),
      });
    } else {
      wx.removeTabBarBadge({ index: 2 });
    }
  },
});
