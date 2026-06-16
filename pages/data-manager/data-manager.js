Page({
  onLoad: function () {
    this.redirect();
  },

  redirect: function () {
    wx.switchTab({ url: '/pages/mine/mine' });
  },
});
