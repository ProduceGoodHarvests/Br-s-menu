var storage = require('../../utils/storage');
var api = require('../../utils/cloud-api');

function compressAvatar(filePath) {
  if (!wx.compressImage) return Promise.resolve(filePath);
  return new Promise(function (resolve) {
    wx.compressImage({
      src: filePath,
      quality: 70,
      success: function (res) { resolve(res.tempFilePath || filePath); },
      fail: function () { resolve(filePath); },
    });
  });
}

function readAvatar(filePath) {
  if (/^https?:\/\//i.test(filePath) && !/^https?:\/\/tmp\//i.test(filePath)) {
    return Promise.reject(new Error('请点击“选择头像”使用微信头像或相册图片'));
  }
  return compressAvatar(filePath).then(function (localPath) {
    return new Promise(function (resolve, reject) {
      wx.getFileSystemManager().readFile({
        filePath: localPath,
        encoding: 'base64',
        success: function (res) {
          var cleanPath = String(localPath || '').split('?')[0].toLowerCase();
          var match = cleanPath.match(/\.([a-z0-9]+)$/);
          var extension = match ? match[1] : 'jpg';
          if (['jpg', 'jpeg', 'png', 'webp'].indexOf(extension) < 0) extension = 'jpg';
          resolve({ base64: res.data, extension: extension });
        },
        fail: reject,
      });
    });
  });
}

Page({
  data: {
    loading: true,
    isAdmin: false,
    member: null,
    cartCount: 0,
    profileEditing: false,
    profileSaving: false,
    profileAuthorizing: false,
    profileForm: { nickname: '', avatar: '' },
    avatarTempPath: '',
    avatarChanged: false,
  },

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

  openProfileEditor: function () {
    var member = this.data.member || {};
    this.setData({
      profileEditing: true,
      profileForm: { nickname: member.nickname || '', avatar: member.avatar || '' },
      avatarTempPath: member.avatar || '',
      avatarChanged: false,
    });
  },

  closeProfileEditor: function () {
    if (this.data.profileSaving || this.data.profileAuthorizing) return;
    this.setData({ profileEditing: false });
  },

  stopTap: function () {},

  onChooseAvatar: function (e) {
    var avatarUrl = e.detail && e.detail.avatarUrl;
    if (!avatarUrl) return;
    this.setData({ avatarTempPath: avatarUrl, avatarChanged: true });
  },

  onNicknameInput: function (e) {
    this.setData({ 'profileForm.nickname': e.detail.value });
  },

  useWechatProfile: function () {
    var that = this;
    if (!wx.getUserProfile || this.data.profileAuthorizing) {
      return wx.showToast({ title: '请手动选择头像并填写昵称', icon: 'none' });
    }
    this.setData({ profileAuthorizing: true });
    wx.getUserProfile({
      desc: '用于在个人中心展示头像和昵称',
      success: function (res) {
        var userInfo = res.userInfo || {};
        that.setData({
          profileAuthorizing: false,
          'profileForm.nickname': userInfo.nickName || that.data.profileForm.nickname,
        });
        wx.showToast({ title: '昵称已填充，请选择头像', icon: 'none' });
      },
      fail: function (err) {
        that.setData({ profileAuthorizing: false });
        if (!err || !/cancel|deny/i.test(err.errMsg || '')) {
          wx.showToast({ title: '获取失败，请手动填写', icon: 'none' });
        }
      },
    });
  },

  saveProfile: function () {
    var that = this;
    var nickname = String(this.data.profileForm.nickname || '').trim();
    if (!nickname) return wx.showToast({ title: '请填写用户名称', icon: 'none' });
    if (this.data.profileSaving) return;
    this.setData({ profileSaving: true });

    var avatarPromise = this.data.avatarChanged && this.data.avatarTempPath
      ? readAvatar(this.data.avatarTempPath)
      : Promise.resolve({ base64: '', extension: '' });

    avatarPromise.then(function (avatarData) {
      return api.updateMemberProfile({
        nickname: nickname,
        avatarBase64: avatarData.base64,
        avatarExtension: avatarData.extension,
      });
    }).then(function (res) {
      var member = res.member || Object.assign({}, that.data.member || {}, { nickname: nickname });
      var app = getApp();
      if (app.globalData.session) app.globalData.session.member = member;
      that.setData({
        member: member,
        profileSaving: false,
        profileEditing: false,
        avatarChanged: false,
      });
      wx.vibrateShort({ type: 'light' });
      wx.showToast({ title: '资料已保存', icon: 'success' });
    }).catch(function (err) {
      that.setData({ profileSaving: false });
      wx.showToast({ title: err.msg || err.message || '保存失败', icon: 'none' });
    });
  },

  goOrders: function () { wx.switchTab({ url: '/pages/orders/orders' }); },
  goCart: function () { wx.switchTab({ url: '/pages/cart/cart' }); },
  goMerchant: function () { wx.navigateTo({ url: '/pages/merchant/merchant' }); },
  about: function () {
    wx.showModal({
      title: '朱冰冉的私房菜',
      content: '微信原生小程序 + 微信云开发\n头像和昵称资料完全自愿，不授权也可正常点餐。',
      showCancel: false,
    });
  },
});
