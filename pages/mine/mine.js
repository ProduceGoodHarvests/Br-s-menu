var storage = require('../../utils/storage');

Page({
  data: { loading: true, isAdmin: false, member: null, cartCount: 0 },

  onShow: function () {
    var that = this;
    var cart = storage.getCart();
    var count = 0;
    for (var i = 0; i < cart.length; i++) count += Number(cart[i].quantity || 0);
    this.setData({ cartCount: count });
    getApp().refreshSession().then(function (session) {
      that.setData({ loading: false, isAdmin: session.isAdmin, member: session.member });
    }).catch(function (err) {
      that.setData({ loading: false });
      wx.showToast({ title: err.msg || '身份加载失败', icon: 'none' });
    });
  },

  goOrders: function () { wx.switchTab({ url: '/pages/orders/orders' }); },
  goCart: function () { wx.switchTab({ url: '/pages/cart/cart' }); },
  goMerchant: function () { wx.navigateTo({ url: '/pages/merchant/merchant' }); },
  about: function () { wx.showModal({ title: '朱冰冉的私房菜', content: '微信原生小程序 + 微信云开发\n无需昵称、头像或手机号授权即可点餐。', showCancel: false }); },
});
