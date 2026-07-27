var storage = require('../../utils/storage');
var api = require('../../utils/cloud-api');

function normalizeMember(member) {
  if (!member) return null;
  member.coinText = Number(member.balance || 0).toFixed(2);
  return member;
}

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
    rechargeEditing: false,
    rechargeSaving: false,
    rechargeAmount: '100',
    rechargeChecking: false,
    rechargePresets: [50, 100, 200, 500],
  },

  onShow: function () {
    var that = this;
    var cart = storage.getCart();
    var count = 0;
    for (var i = 0; i < cart.length; i++) count += Number(cart[i].quantity || 0);
    this.setData({ cartCount: count });
    getApp().refreshSession().then(function (session) {
      that.setData({ loading: false, isAdmin: session.isAdmin, member: normalizeMember(session.member) }, function () {
        if (storage.consumeRechargeOpen()) that.openRecharge();
      });
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

  openRecharge: function () {
    if (this.data.rechargeSaving || this.data.rechargeChecking) return;
    this.setData({ rechargeEditing: true, rechargeAmount: '100' });
  },

  closeRecharge: function () {
    if (this.data.rechargeSaving || this.data.rechargeChecking) return;
    this.setData({ rechargeEditing: false });
  },

  selectRechargeAmount: function (e) {
    this.setData({ rechargeAmount: String(e.currentTarget.dataset.amount) });
  },

  onRechargeAmountInput: function (e) {
    this.setData({ rechargeAmount: e.detail.value || '' });
  },

  submitRecharge: function () {
    var that = this;
    var amount = Math.round(Number(this.data.rechargeAmount) * 100) / 100;
    if (this.data.rechargeSaving || this.data.rechargeChecking) return;
    if (!Number.isFinite(amount) || amount < 1) return wx.showToast({ title: '请输入不少于1元的充值金额', icon: 'none' });
    if (amount > 100000) return wx.showToast({ title: '单次充值不能超过100000元', icon: 'none' });
    this.setData({ rechargeSaving: true });
    api.createRecharge(amount).then(function (result) {
      return new Promise(function (resolve, reject) {
        wx.requestPayment(Object.assign({}, result.payment, {
          success: function () { resolve(result); },
          fail: reject,
        }));
      });
    }).then(function (result) {
      that.setData({ rechargeSaving: false, rechargeChecking: true });
      wx.showLoading({ title: '正在确认到账' });
      return that.checkRechargeStatus(result.rechargeId, 0);
    }).then(function (status) {
      wx.hideLoading();
      that.setData({ rechargeChecking: false, rechargeEditing: false });
      if (status && status.status === 'paid') {
        that.setData({ member: normalizeMember(Object.assign({}, that.data.member || {}, { balance: status.balance })) });
        var app = getApp();
        app.refreshSession().then(function (session) {
          that.setData({ member: normalizeMember(session.member) });
        }).catch(function () {});
        wx.showToast({ title: '充值成功 +' + Number(status.coinAmount || 0).toFixed(2) + '金币', icon: 'success' });
        return;
      }
      if (status && status.status !== 'pending') throw { msg: '充值订单状态异常，请联系商家核查' };
      wx.showToast({ title: '支付成功，金币到账可能需要几秒', icon: 'none' });
    }).catch(function (err) {
      wx.hideLoading();
      that.setData({ rechargeSaving: false, rechargeChecking: false });
      if (err && /cancel/i.test(err.errMsg || '')) return;
      wx.showModal({ title: '充值未完成', content: (err && (err.msg || err.message)) || '请稍后重试', showCancel: false });
    });
  },

  checkRechargeStatus: function (rechargeId, attempt) {
    var that = this;
    return api.getRechargeStatus(rechargeId).then(function (status) {
      if (status.status === 'paid' || status.status === 'failed' || status.status === 'expired' || attempt >= 5) return status;
      return new Promise(function (resolve, reject) {
        setTimeout(function () { that.checkRechargeStatus(rechargeId, attempt + 1).then(resolve).catch(reject); }, 800);
      });
    });
  },

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
      var member = normalizeMember(res.member || Object.assign({}, that.data.member || {}, { nickname: nickname }));
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
  goWalletRecords: function () { wx.navigateTo({ url: '/pages/wallet-records/wallet-records' }); },
  goMerchant: function () { wx.navigateTo({ url: '/pages/merchant/merchant' }); },
  about: function () {
    wx.showModal({
      title: '朱冰冉的私房菜',
      content: '微信原生小程序 + 微信云开发\n头像和昵称资料完全自愿，不授权也可正常点餐。',
      showCancel: false,
    });
  },
});
