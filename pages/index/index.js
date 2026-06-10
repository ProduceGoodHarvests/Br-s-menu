// pages/index/index.js — 点餐首页
const mock = require('../../utils/mock-data');

Page({
  data: {
    searchKeyword: '',
    categories: [],
    activeCategory: 0, // 0 = 全部
    foodList: [],
    allFoods: [],
    hotFoods: [],
    cartCount: 0,
    showSearch: false,
    searchResults: [],
  },

  onLoad: function () {
    this.initData();
  },

  onShow: function () {
    this.updateCartBadge();
  },

  initData: function () {
    const categories = mock.categories;
    const allFoods = mock.foods;
    const hotFoods = mock.getHotFoods(6);

    // 添加"全部"分类
    const allCategories = [
      { id: 0, name: '全部', icon: '📋' },
      ...categories
    ];

    this.setData({
      categories: allCategories,
      allFoods: allFoods,
      foodList: allFoods,
      hotFoods: hotFoods,
    });
  },

  // 切换分类
  switchCategory: function (e) {
    const categoryId = parseInt(e.currentTarget.dataset.id);
    this.setData({ activeCategory: categoryId });

    if (categoryId === 0) {
      this.setData({ foodList: this.data.allFoods });
    } else {
      const filtered = mock.getFoodsByCategory(categoryId);
      this.setData({ foodList: filtered });
    }
  },

  // 搜索
  onSearchInput: function (e) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword });
    if (keyword.trim()) {
      const results = mock.searchFoods(keyword);
      this.setData({ searchResults: results, showSearch: true });
    } else {
      this.setData({ showSearch: false, searchResults: [] });
    }
  },

  // 取消搜索
  cancelSearch: function () {
    this.setData({
      searchKeyword: '',
      showSearch: false,
      searchResults: [],
    });
  },

  // 去商品详情
  goDetail: function (e) {
    const foodId = parseInt(e.currentTarget.dataset.id);
    wx.navigateTo({
      url: `/pages/detail/detail?id=${foodId}`,
    });
  },

  // 加入购物车
  addToCart: function (e) {
    const foodId = parseInt(e.currentTarget.dataset.id);
    const food = mock.getFoodById(foodId);
    if (!food) return;

    const defaultSpecs = food.specs && food.specs.length > 0
      ? food.specs.map(s => ({ name: s.name, value: s.options[0] }))
      : [];
    const specKey = defaultSpecs.map(s => s.name + ':' + s.value).join('|');

    let cart = wx.getStorageSync('cart') || [];
    const index = cart.findIndex(item => item.id === foodId && (item.specKey || '') === specKey);

    if (index > -1) {
      cart[index].quantity += 1;
    } else {
      cart.push({
        id: food.id,
        name: food.name,
        icon: food.icon,
        price: food.price,
        specs: defaultSpecs,
        specKey: specKey,
        quantity: 1,
      });
    }

    wx.setStorageSync('cart', cart);
    this.updateCartBadge();

    wx.showToast({
      title: '已加入购物车',
      icon: 'success',
      duration: 1000,
    });
  },

  // 更新购物车角标
  updateCartBadge: function () {
    const cart = wx.getStorageSync('cart') || [];
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    this.setData({ cartCount: count });

    const app = getApp();
    if (app) {
      app.globalData.cartCount = count;
    }
  },
});
