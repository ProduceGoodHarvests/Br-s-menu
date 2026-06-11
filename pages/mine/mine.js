// pages/mine/mine.js
var storage = require('../../utils/storage');

Page({
  data: {
    userInfo: { avatar: '', nickname: '食客', phone: '138****8888' },
    orderCount: 0,
    isMerchant: false,
  },

  onShow: function () {
    var app = getApp();
    var isMerchant = app.getRole() === 'merchant';
    this.setData({ isMerchant: isMerchant });
    var orders = storage.getOrders();
    this.setData({ orderCount: orders.length });
  },

  onTapAvatar: function () {
    var role = this.data.isMerchant ? '商家模式' : '顾客模式';
    wx.showToast({ title: '当前：' + role, icon: 'none' });
  },

  // 切换角色
  toggleRole: function () {
    var that = this;
    var currentRole = this.data.isMerchant ? 'merchant' : 'customer';
    var newRole = currentRole === 'merchant' ? 'customer' : 'merchant';
    var label = newRole === 'merchant' ? '商家模式' : '顾客模式';
    wx.showModal({
      title: '切换角色',
      content: '确定切换到「' + label + '」吗？\n\n顾客：浏览菜单、下单\n商家：查看订单、接单出餐',
      success: function (res) {
        if (res.confirm) {
          var app = getApp();
          app.switchRole(newRole);
          that.setData({ isMerchant: newRole === 'merchant' });
          wx.showToast({ title: '已切换到' + label, icon: 'success' });
        }
      },
    });
  },

  goOrders: function () { wx.switchTab({ url: '/pages/orders/orders' }); },
  goCart: function () { wx.switchTab({ url: '/pages/cart/cart' }); },
  goAddDish: function () { wx.navigateTo({ url: '/pages/add-dish/add-dish' }); },

  contactService: function () {
    wx.showModal({
      title: '联系客服',
      content: '客服电话：400-123-4567\n工作时间：09:00-21:00',
      showCancel: false, confirmText: '知道了',
    });
  },

  aboutUs: function () {
    wx.showModal({
      title: '朱冰冉的私房菜',
      content: 'v2.0\n\n双人协作点餐小程序\n顾客下单 + 商家接单\n数据本地存储，无需服务端',
      showCancel: false, confirmText: '关闭',
    });
  },

  clearCache: function () {
    var that = this;
    wx.showModal({
      title: '清空数据',
      content: '确定清空购物车和所有订单吗？',
      success: function (res) {
        if (res.confirm) {
          storage.clearCart();
          storage.setOrders([]);
          storage.clearCheckout();
          storage.setCustomDishes([]);
          wx.showToast({ title: '已清空', icon: 'success' });
          that.setData({ orderCount: 0 });
        }
      },
    });
  },
});
