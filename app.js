var storage = require('./utils/storage');
var api = require('./utils/cloud-api');

var THEME_META = {
  light: { name: '浅色模式', nav: '#ff6a2a', page: '#f6f7fb', tab: '#ffffff', tabText: '#8a8f99', selected: '#ff6a2a', border: 'black' },
  dark: { name: '夜间模式', nav: '#181b22', page: '#111318', tab: '#1b1f27', tabText: '#98a1b1', selected: '#ff986d', border: 'white' },
  ocean: { name: '海洋蓝', nav: '#277fc7', page: '#edf6fc', tab: '#fafdff', tabText: '#71869a', selected: '#277fc7', border: 'black' },
  forest: { name: '森林绿', nav: '#368664', page: '#eef7f1', tab: '#fbfefc', tabText: '#758a7c', selected: '#368664', border: 'black' },
  rose: { name: '暖霞粉', nav: '#c9647a', page: '#fdf1f3', tab: '#fffafb', tabText: '#927a80', selected: '#c9647a', border: 'black' },
};

var TAB_ACTIVE_ICONS = {
  light: ['imgs/tab-home-active.png', 'imgs/tab-order-active.png', 'imgs/tab-cart-active.png', 'imgs/tab-mine-active.png'],
  dark: ['imgs/tab-home-active-dark.png', 'imgs/tab-order-active-dark.png', 'imgs/tab-cart-active-dark.png', 'imgs/tab-mine-active-dark.png'],
  ocean: ['imgs/tab-home-active-ocean.png', 'imgs/tab-order-active-ocean.png', 'imgs/tab-cart-active-ocean.png', 'imgs/tab-mine-active-ocean.png'],
  forest: ['imgs/tab-home-active-forest.png', 'imgs/tab-order-active-forest.png', 'imgs/tab-cart-active-forest.png', 'imgs/tab-mine-active-forest.png'],
  rose: ['imgs/tab-home-active-rose.png', 'imgs/tab-order-active-rose.png', 'imgs/tab-cart-active-rose.png', 'imgs/tab-mine-active-rose.png'],
};

var TAB_INACTIVE_ICONS = {
  light: ['imgs/tab-home.png', 'imgs/tab-order.png', 'imgs/tab-cart.png', 'imgs/tab-mine.png'],
  dark: ['imgs/tab-home-dark.png', 'imgs/tab-order-dark.png', 'imgs/tab-cart-dark.png', 'imgs/tab-mine-dark.png'],
  ocean: ['imgs/tab-home-ocean.png', 'imgs/tab-order-ocean.png', 'imgs/tab-cart-ocean.png', 'imgs/tab-mine-ocean.png'],
  forest: ['imgs/tab-home-forest.png', 'imgs/tab-order-forest.png', 'imgs/tab-cart-forest.png', 'imgs/tab-mine-forest.png'],
  rose: ['imgs/tab-home-rose.png', 'imgs/tab-order-rose.png', 'imgs/tab-cart-rose.png', 'imgs/tab-mine-rose.png'],
};

App({
  globalData: {
    cartCount: 0,
    session: null,
    sessionPromise: null,
    theme: 'light',
  },

  onLaunch: function (options) {
    api.init();
    this.globalData.theme = storage.getTheme();
    this.applyThemeChrome();
    this.captureScene(options || {});
    this.refreshSession().catch(function () {});
    this.updateCartCount();
  },

  onShow: function (options) {
    if (options) this.captureScene(options);
    this.applyThemeChrome();
    this.updateCartCount();
  },

  getTheme: function () {
    return THEME_META[this.globalData.theme] ? this.globalData.theme : 'light';
  },

  getThemeClass: function () {
    return 'theme-' + this.getTheme();
  },

  getThemeName: function () {
    return THEME_META[this.getTheme()].name;
  },

  getThemeAccent: function () {
    return THEME_META[this.getTheme()].selected;
  },

  applyThemeChrome: function () {
    var theme = THEME_META[this.getTheme()];
    if (wx.setNavigationBarColor) {
      wx.setNavigationBarColor({
        frontColor: '#ffffff',
        backgroundColor: theme.nav,
        animation: { duration: 180, timingFunc: 'easeIn' },
      });
    }
    if (wx.setBackgroundColor) wx.setBackgroundColor({ backgroundColor: theme.page, backgroundColorTop: theme.page, backgroundColorBottom: theme.page });
    if (wx.setTabBarStyle) {
      wx.setTabBarStyle({
        color: theme.tabText,
        selectedColor: theme.selected,
        backgroundColor: theme.tab,
        borderStyle: theme.border,
      });
    }
    if (wx.setTabBarItem) {
      var activeIcons = TAB_ACTIVE_ICONS[this.getTheme()] || TAB_ACTIVE_ICONS.light;
      var inactiveIcons = TAB_INACTIVE_ICONS[this.getTheme()] || TAB_INACTIVE_ICONS.light;
      for (var i = 0; i < activeIcons.length; i++) wx.setTabBarItem({ index: i, iconPath: inactiveIcons[i], selectedIconPath: activeIcons[i] });
    }
  },

  setTheme: function (theme) {
    this.globalData.theme = THEME_META[theme] ? theme : 'light';
    storage.setTheme(this.globalData.theme);
    this.applyThemeChrome();
    var pages = getCurrentPages();
    for (var i = 0; i < pages.length; i++) {
      if (pages[i] && pages[i].setData) pages[i].setData({ themeClass: this.getThemeClass(), themeAccent: this.getThemeAccent() });
    }
  },

  syncPageTheme: function (page) {
    this.applyThemeChrome();
    if (page && page.setData) page.setData({ themeClass: this.getThemeClass(), themeAccent: this.getThemeAccent() });
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
