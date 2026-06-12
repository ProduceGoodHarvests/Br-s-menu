// pages/add-dish/add-dish.js
var storage = require('../../utils/storage');
var mock = require('../../utils/mock-data');

Page({
  data: {
    categories: [],
    name: '',
    categoryIndex: 0,
    price: '',
    tag: '',
    tags: [],
    myDishes: [],
  },

  onLoad: function () {
    this.setData({ categories: mock.cats });
    this.loadData();
  },

  onShow: function () {
    this.loadData();
  },

  loadData: function () {
    this.setData({
      tags: storage.getDishTags(),
      myDishes: storage.getCustomDishes(),
    });
  },

  selectCategory: function (e) {
    this.setData({ categoryIndex: parseInt(e.currentTarget.dataset.index) });
  },

  selectTag: function (e) {
    this.setData({ tag: e.currentTarget.dataset.tag || '' });
  },

  goTagManager: function () {
    wx.navigateTo({ url: '/pages/tag-manager/tag-manager' });
  },

  onNameInput: function (e) { this.setData({ name: e.detail.value }); },
  onPriceInput: function (e) { this.setData({ price: e.detail.value }); },
  onTagInput: function (e) { this.setData({ tag: e.detail.value }); },

  addDish: function () {
    var name = this.data.name.trim();
    var price = parseFloat(this.data.price);
    var tag = this.data.tag.replace(/^#+/, '').trim();
    if (!name) { wx.showToast({ title: '请输入菜品名称', icon: 'none' }); return; }
    if (!price || price <= 0) { wx.showToast({ title: '请输入有效价格', icon: 'none' }); return; }
    if (tag && this.data.tags.indexOf(tag) === -1) storage.addDishTag(tag);

    var cat = this.data.categories[this.data.categoryIndex];
    var dish = {
      i: Date.now(),
      c: cat.id,
      n: name,
      e: cat.e ? cat.e[Math.floor(Math.random() * cat.e.length)] : '🍽️',
      p: price,
      o: price,
      s: 0,
      r: 5.0,
      t: tag,
      custom: true,
    };

    var dishes = storage.getCustomDishes();
    dishes.unshift(dish);
    storage.setCustomDishes(dishes);
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' });
    this.setData({ name: '', price: '', tag: '', tags: storage.getDishTags(), myDishes: dishes });
    wx.showToast({ title: '添加成功', icon: 'success' });
  },

  deleteDish: function (e) {
    var that = this;
    var idx = parseInt(e.currentTarget.dataset.index);
    wx.showModal({
      title: '删除菜品',
      content: '确定删除「' + this.data.myDishes[idx].n + '」吗？',
      success: function (res) {
        if (res.confirm) {
          var dishes = storage.getCustomDishes();
          dishes.splice(idx, 1);
          storage.setCustomDishes(dishes);
          that.setData({ myDishes: dishes });
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      },
    });
  },
});
