var storage = require('./utils/storage');
var api = require('./utils/cloud-api');

App({
  globalData: {
    cartCount: 0,
    session: null,
    sessionPromise: null,
  },

  onLaunch: function (options) {
    api.init();
    this.captureScene(options || {});
    this.refreshSession().catch(function () {});
    this.updateCartCount();
  },

  onShow: function (options) {
    if (options) this.captureScene(options);
    this.updateCartCount();
  },

  captureScene: function (options) {
    var query = options.query || {};
    var tableNo = query.tableNo || query.table || '';
    var type = query.type || '';

    if (query.q) {
      try {
        var decoded = decodeURIComponent(query.q);
        var match = decoded.match(/[?&](?:tableNo|table)=([^&#]+)/i);
        if (match) tableNo = decodeURIComponent(match[1]);
        var typeMatch = decoded.match(/[?&]type=([^&#]+)/i);
        if (typeMatch) type = decodeURIComponent(typeMatch[1]);
      } catch (err) {
        console.warn('扫码参数解析失败', err);
      }
    }

    if (tableNo || type) {
      var context = storage.getOrderContext();
      storage.setOrderContext({
        type: ['dine_in', 'takeaway', 'pickup'].indexOf(type) >= 0 ? type : context.type,
        tableNo: tableNo || context.tableNo,
      });
    }
  },

  refreshSession: function () {
    var that = this;
    this.globalData.sessionPromise = api.getCurrentUser().then(function (result) {
      that.globalData.session = result;
      return result;
    }).catch(function (err) {
      that.globalData.session = null;
      throw err;
    });
    return this.globalData.sessionPromise;
  },

  getSession: function () {
    return this.globalData.sessionPromise || this.refreshSession();
  },

  updateCartCount: function () {
    var cart = storage.getCart();
    var count = 0;
    for (var i = 0; i < cart.length; i++) count += Number(cart[i].quantity || 0);
    this.globalData.cartCount = count;
    if (!wx.setTabBarBadge) return;
    if (count > 0) {
      wx.setTabBarBadge({ index: 2, text: count > 99 ? '99+' : String(count) });
    } else if (wx.removeTabBarBadge) {
      wx.removeTabBarBadge({ index: 2 });
    }
  },
});
