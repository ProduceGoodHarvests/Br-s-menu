// pages/tag-manager/tag-manager.js
var storage = require('../../utils/storage');
var mock = require('../../utils/mock-data');

function allFoods() {
  return mock.all.concat(storage.getCustomDishes());
}

function tagCounts() {
  var counts = {};
  var foods = allFoods();
  for (var i = 0; i < foods.length; i++) {
    var tag = foods[i].t || '';
    if (tag) counts[tag] = (counts[tag] || 0) + 1;
  }
  return counts;
}

function buildItems(tags) {
  var counts = tagCounts();
  var items = [];
  for (var i = 0; i < tags.length; i++) {
    items.push({ name: tags[i], count: counts[tags[i]] || 0 });
  }
  return items;
}

Page({
  data: {
    tags: [],
    tagItems: [],
    newTag: '',
  },

  onLoad: function () {
    this.loadTags();
  },

  onShow: function () {
    this.loadTags();
  },

  loadTags: function () {
    var tags = storage.getDishTags();
    this.setData({ tags: tags, tagItems: buildItems(tags) });
  },

  onTagInput: function (e) {
    this.setData({ newTag: e.detail.value });
  },

  addTag: function () {
    var name = this.data.newTag.replace(/^#+/, '').trim();
    if (!name) {
      wx.showToast({ title: '请输入标签名称', icon: 'none' });
      return;
    }
    if (name.length > 8) {
      wx.showToast({ title: '标签不超过8个字', icon: 'none' });
      return;
    }
    if (this.data.tags.indexOf(name) !== -1) {
      wx.showToast({ title: '标签已存在', icon: 'none' });
      return;
    }
    if (this.data.tags.length >= 20) {
      wx.showToast({ title: '最多保留20个标签', icon: 'none' });
      return;
    }
    storage.addDishTag(name);
    this.setData({ newTag: '' });
    this.loadTags();
    wx.showToast({ title: '已添加', icon: 'success' });
  },

  deleteTag: function (e) {
    var that = this;
    var name = e.currentTarget.dataset.name;
    wx.showModal({
      title: '删除标签',
      content: '确定删除「' + name + '」吗？',
      success: function (res) {
        if (!res.confirm) return;
        storage.removeDishTag(name);

        var dishes = storage.getCustomDishes();
        var changed = false;
        for (var i = 0; i < dishes.length; i++) {
          if (dishes[i].t === name) {
            dishes[i].t = '';
            changed = true;
          }
        }
        if (changed) storage.setCustomDishes(dishes);

        that.loadTags();
        wx.showToast({ title: '已删除', icon: 'success' });
      },
    });
  },

  resetTags: function () {
    var that = this;
    wx.showModal({
      title: '恢复默认',
      content: '确定恢复默认标签吗？',
      success: function (res) {
        if (!res.confirm) return;
        storage.resetDishTags();
        that.loadTags();
        wx.showToast({ title: '已恢复', icon: 'success' });
      },
    });
  },
});
