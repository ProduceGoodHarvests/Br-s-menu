var storage = require('../../utils/storage');

function countCartItems() {
  var cart = storage.getCart();
  var count = 0;

  for (var i = 0; i < cart.length; i++) {
    count += cart[i].quantity || 0;
  }

  return count;
}

Page({
  data: {
    userInfo: { avatar: '', nickname: '' },
    isMerchant: false,
    isLogin: false,
    openid: '',
    orderCount: 0,
    activeCount: 0,
    completedCount: 0,
    cartCount: 0,
  },

  onShow: function () {
    this.refreshRole();
    this.refreshStats();
    this.checkLogin();
  },

  refreshRole: function () {
    var app = getApp();
    this.setData({
      isMerchant: app && app.getRole && app.getRole() === 'merchant',
    });
  },

  refreshStats: function () {
    var orders = storage.getOrders();
    var active = 0;
    var completed = 0;

    for (var i = 0; i < orders.length; i++) {
      if (orders[i].status === 'completed') completed += 1;
      else active += 1;
    }

    this.setData({
      orderCount: orders.length,
      activeCount: active,
      completedCount: completed,
      cartCount: countCartItems(),
    });
  },

  checkLogin: function () {
    var info = storage.getLoginInfo();

    if (info && info.openid) {
      this.setData({
        isLogin: true,
        openid: info.openid,
        userInfo: {
          nickname: info.nickname || '食客',
          avatar: info.avatar || '',
        },
      });
      return;
    }

    this.setData({
      isLogin: false,
      openid: '',
      userInfo: { avatar: '', nickname: '' },
    });
  },

  doLogin: function () {
    var that = this;

    if (!wx.getUserProfile) {
      this.finishLogin({ nickName: '本地用户', avatarUrl: '' }, 'local');
      return;
    }

    wx.getUserProfile({
      desc: '用于展示点餐用户信息',
      success: function (res) {
        that.loginWithCloud(res.userInfo);
      },
      fail: function () {
        wx.showToast({ title: '授权后才能登录', icon: 'none' });
      },
    });
  },

  loginWithCloud: function (user) {
    var that = this;

    wx.showLoading({ title: '登录中...' });

    if (!wx.cloud) {
      wx.hideLoading();
      this.finishLogin(user, 'local');
      return;
    }

    wx.cloud.callFunction({
      name: 'login',
      success: function (res) {
        wx.hideLoading();
        var openid = res.result && res.result.openid ? res.result.openid : 'local';
        that.finishLogin(user, openid);
      },
      fail: function () {
        wx.hideLoading();
        that.finishLogin(user, 'local');
      },
    });
  },

  finishLogin: function (user, openid) {
    var info = {
      openid: openid || 'local',
      nickname: user.nickName || '食客',
      avatar: user.avatarUrl || '',
    };

    storage.setLoginInfo(info);
    this.setData({
      isLogin: true,
      openid: info.openid,
      userInfo: {
        nickname: info.nickname,
        avatar: info.avatar,
      },
    });

    wx.showToast({ title: '登录成功', icon: 'success' });
  },

  doLogout: function () {
    var that = this;

    wx.showModal({
      title: '退出登录',
      content: '退出后本地订单和购物车不会被清空。',
      success: function (res) {
        if (!res.confirm) return;

        storage.clearLoginInfo();
        that.checkLogin();
        wx.showToast({ title: '已退出', icon: 'success' });
      },
    });
  },

  onTapAvatar: function () {
    if (!this.data.isLogin) this.doLogin();
  },

  toggleRole: function () {
    var that = this;
    var nextRole = this.data.isMerchant ? 'customer' : 'merchant';
    var label = nextRole === 'merchant' ? '商家模式' : '顾客模式';

    wx.showModal({
      title: '切换角色',
      content: '确认切换到' + label + '吗？',
      success: function (res) {
        if (!res.confirm) return;

        var app = getApp();
        if (app && app.switchRole) app.switchRole(nextRole);

        that.setData({ isMerchant: nextRole === 'merchant' });
        wx.showToast({ title: '已切换', icon: 'success' });
      },
    });
  },

  goOrders: function () {
    wx.switchTab({ url: '/pages/orders/orders' });
  },

  goCart: function () {
    wx.switchTab({ url: '/pages/cart/cart' });
  },

  goMerchant: function () {
    wx.navigateTo({ url: '/pages/merchant/merchant' });
  },

  aboutUs: function () {
    wx.showModal({
      title: '朱冰冉的私房菜',
      content: 'v3.1\n\n顾客点餐、购物车结算、订单追踪和商家接单管理均支持本地运行；云开发可作为可选同步能力。',
      showCancel: false,
      confirmText: '关闭',
    });
  },
});
