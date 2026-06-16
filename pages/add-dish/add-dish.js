Page({
  onLoad: function () {
    this.redirect();
  },

  redirect: function () {
    wx.redirectTo({ url: '/pages/merchant/merchant' });
  },
});
