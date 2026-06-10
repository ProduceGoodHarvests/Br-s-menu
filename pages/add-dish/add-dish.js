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
    tags: ['招牌','人气','爆款','新品','下饭','品质','夏日','推荐','鲜香'],
    myDishes: [],
  },

  onLoad: function () {
    this.setData({ categories: mock.cats });
    this.loadMyDishes();
  },

  onShow: function () {
    this.loadMyDishes();
  },

  loadMyDishes: function () {
    var dishes = storage.getCustomDishes();
    this.setData({ myDishes: dishes });
  },

  // 选择分类
  selectCategory: function (e) {
    this.setData({ categoryIndex: parseInt(e.currentTarget.dataset.index) });
  },

  // 输入
  onNameInput: function (e) { this.setData({ name: e.detail.value }); },
  onPriceInput: function (e) { this.setData({ price: e.detail.value }); },
  onTagInput: function (e) { this.setData({ tag: e.detail.value }); },

  // 添加菜品
  addDish: function () {
    var name = this.data.name.trim();
    var price = parseFloat(this.data.price);
    if (!name) { wx.showToast({ title: '请输入菜品名称', icon: 'none' }); return; }
    if (!price || price <= 0) { wx.showToast({ title: '请输入有效价格', icon: 'none' }); return; }

    var cat = this.data.categories[this.data.categoryIndex];
    var dish = {
      i: Date.now(),  // 用时间戳做唯一ID
      c: cat.id,
      n: name,
      e: cat.e ? cat.e[Math.floor(Math.random() * cat.e.length)] : '🍽️',
      p: price,
      o: price,
      s: 0,
      r: 5.0,
      t: this.data.tag.trim() || '',
      custom: true,
    };

    var dishes = storage.getCustomDishes();
    dishes.unshift(dish);
    storage.setCustomDishes(dishes);

    this.setData({ name: '', price: '', tag: '', myDishes: dishes });
    wx.showToast({ title: '添加成功！', icon: 'success' });
  },

  // 删除自定义菜品
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
