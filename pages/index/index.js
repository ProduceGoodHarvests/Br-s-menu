var api = require('../../utils/cloud-api');
var storage = require('../../utils/storage');
var menu = require('../../utils/menu');

Page({
  data: {
    loading: true,
    error: '',
    categories: [],
    activeCategory: 'all',
    dishes: [],
    visibleDishes: [],
    keyword: '',
    contextType: 'dine_in',
    contextText: '堂食',
    tableNo: '',
    cartCount: 0,
    scenePanelVisible: false,
    addingId: '',
    cartPulse: false,
    store: { isOpen: true, pauseReason: '' },
    skeletons: [1, 2, 3, 4],
    scenes: [
      { value: 'dine_in', label: '堂食', icon: '🍽', desc: '选择桌台，店内用餐' },
      { value: 'takeaway', label: '打包带走', icon: '🥡', desc: '到店取餐，打包带走' },
      { value: 'pickup', label: '到店自提', icon: '🛍', desc: '提前下单，到店即取' },
    ],
  },

  onLoad: function () { this.loadMenu(); },

  onShow: function () {
    var context = storage.getOrderContext();
    var cart = storage.getCart();
    var count = 0;
    for (var i = 0; i < cart.length; i++) count += Number(cart[i].quantity || 0);
    this.setData({
      contextType: context.type,
      contextText: this.typeText(context.type),
      tableNo: context.tableNo,
      cartCount: count,
    });
    var that = this;
    api.getAppConfig().then(function (result) {
      if (result.store) that.setData({ store: result.store });
    }).catch(function () {});
  },

  typeText: function (type) {
    return { dine_in: '堂食', takeaway: '打包带走', pickup: '到店自提' }[type] || '堂食';
  },

  loadMenu: function () {
    var that = this;
    this.setData({ loading: true, error: '' });
    api.getMenu().then(function (result) {
      storage.setMenuCache(result);
      that.useMenu(result);
    }).catch(function (err) {
      var cached = storage.getMenuCache();
      if (cached.dishes && cached.dishes.length) {
        that.useMenu(cached);
        that.setData({ error: '当前显示最近一次菜单，联网后可自动更新' });
      } else {
        that.setData({ loading: false, error: err.msg || '菜单加载失败，请下拉重试' });
      }
    });
  },

  useMenu: function (result) {
    var categories = [{ _id: 'all', name: '全部' }].concat(result.categories || []);
    var dishes = [];
    for (var i = 0; i < (result.dishes || []).length; i++) dishes.push(menu.normalizeDish(result.dishes[i]));
    this.setData({ categories: categories, dishes: dishes, store: result.store || this.data.store, loading: false });
    this.applyFilter();
  },

  applyFilter: function () {
    var active = this.data.activeCategory;
    var keyword = String(this.data.keyword || '').trim().toLowerCase();
    var visible = [];
    for (var i = 0; i < this.data.dishes.length; i++) {
      var dish = this.data.dishes[i];
      var categoryMatch = active === 'all' || dish.cid === active;
      var text = (dish.name + ' ' + dish.desc).toLowerCase();
      if (categoryMatch && (!keyword || text.indexOf(keyword) >= 0)) visible.push(dish);
    }
    this.setData({ visibleDishes: visible });
  },

  switchCategory: function (e) {
    this.setData({ activeCategory: e.currentTarget.dataset.id });
    this.applyFilter();
  },

  onSearchInput: function (e) {
    this.setData({ keyword: e.detail.value || '' });
    this.applyFilter();
  },

  clearSearch: function () {
    this.setData({ keyword: '' });
    this.applyFilter();
  },

  chooseType: function () {
    this.setData({ scenePanelVisible: true });
  },

  closeScenePanel: function () {
    this.setData({ scenePanelVisible: false });
  },

  selectScene: function (e) {
    var type = e.currentTarget.dataset.type;
    storage.setOrderContext({ type: type });
    this.setData({
      contextType: type,
      contextText: this.typeText(type),
      scenePanelVisible: false,
    });
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' });
  },

  goDetail: function (e) {
    if (!this.isStoreOpen()) return this.showStoreClosed();
    wx.navigateTo({ url: '/pages/detail/detail?id=' + encodeURIComponent(e.currentTarget.dataset.id) });
  },

  addToCart: function (e) {
    if (!this.isStoreOpen()) return this.showStoreClosed();
    var dish = menu.findDish(this.data.dishes, e.currentTarget.dataset.id);
    if (!dish) return;
    if (dish.stock <= 0) return wx.showToast({ title: '暂时售罄', icon: 'none' });
    if (dish.spec.length) return this.goDetail(e);
    storage.addCartItem(dish, 1, {});
    getApp().updateCartCount();
    var cart = storage.getCart();
    var count = 0;
    for (var i = 0; i < cart.length; i++) count += Number(cart[i].quantity || 0);
    this.setData({ cartCount: count, addingId: dish._id, cartPulse: true });
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' });
    var that = this;
    setTimeout(function () { that.setData({ addingId: '', cartPulse: false }); }, 420);
  },

  goCart: function () { wx.switchTab({ url: '/pages/cart/cart' }); },

  isStoreOpen: function () { return !this.data.store || this.data.store.isOpen !== false; },
  showStoreClosed: function () {
    wx.showToast({ title: (this.data.store && this.data.store.pauseReason) || '门店暂停营业，请稍后再来', icon: 'none' });
  },

  onPullDownRefresh: function () {
    var that = this;
    this.loadMenu();
    setTimeout(function () { wx.stopPullDownRefresh(); }, 500);
  },
});
