// pages/mine/mine.js
Page({
  data: {
    userInfo: {
      avatar: '',
      nickname: '食客',
      phone: '138****8888',
    },
    orderCount: 0,
  },

  onShow: function () {
    const orders = wx.getStorageSync('orders') || [];
    this.setData({ orderCount: orders.length });
  },

  // 点击头像
  onTapAvatar: function () {
    wx.showToast({ title: '欢迎使用美味点餐', icon: 'none' });
  },

  // 我的订单
  goOrders: function () {
    wx.switchTab({ url: '/pages/orders/orders' });
  },

  // 购物车
  goCart: function () {
    wx.switchTab({ url: '/pages/cart/cart' });
  },

  // 联系客服（模拟）
  contactService: function () {
    wx.showModal({
      title: '联系客服',
      content: '客服电话：400-123-4567\n工作时间：09:00-21:00',
      showCancel: false,
      confirmText: '知道了',
    });
  },

  // 关于我们
  aboutUs: function () {
    wx.showModal({
      title: '美味点餐',
      content: 'v1.0.0\n\n纯前端模拟点餐小程序\n无需服务端，数据全模拟\n\n适用于小程序学习和演示',
      showCancel: false,
      confirmText: '关闭',
    });
  },

  // 清空缓存
  clearCache: function () {
    wx.showModal({
      title: '提示',
      content: '确定要清空所有数据吗？（购物车和订单记录将被清除）',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('cart');
          wx.removeStorageSync('orders');
          wx.removeStorageSync('checkoutItems');
          wx.showToast({ title: '已清空', icon: 'success' });
          this.setData({ orderCount: 0 });
        }
      },
    });
  },
});
