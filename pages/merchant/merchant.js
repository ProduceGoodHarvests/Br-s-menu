var storage = require('../../utils/storage');
var menu = require('../../utils/menu');
var api = require('../../utils/cloud-api');
var format = require('../../utils/format');

Page({
  data: {
    tab: 'orders',
    orders: [],
    dishes: [],
    categories: [],
    showAddForm: false,
    dishName: '',
    dishPrice: '',
    dishCat: 1,
    dishTag: '',
  },

  onShow: function () {
    this.loadOrders();
    this.loadDishes();
    this.loadCategories();
  },

  switchTab: function (e) {
    this.setData({ tab: e.currentTarget.dataset.tab });
  },

  loadOrders: function () {
    var that = this;

    api.getOrders().then(function (res) {
      that.setData({ orders: that.normalizeOrders(res.orders || []) });
    }).catch(function () {
      that.setData({ orders: that.normalizeOrders(storage.getOrders()) });
    });
  },

  normalizeOrders: function (orders) {
    var list = [];

    for (var i = 0; i < orders.length; i++) {
      list.push({
        id: orders[i].id || orders[i]._id,
        table: orders[i].table || '',
        items: orders[i].items || [],
        totalPrice: format.formatMoney(orders[i].totalPrice || 0),
        status: orders[i].status || 'pending',
        statusText:
          orders[i].status === 'completed'
            ? '已完成'
            : orders[i].status === 'confirmed'
            ? '制作中'
            : '待接单',
        createTime: format.formatDateTime(orders[i].createTime),
      });
    }

    return list;
  },

  loadCategories: function () {
    this.setData({ categories: menu.getCategories(false) });
  },

  loadDishes: function () {
    this.setData({ dishes: menu.getManageDishes() });
  },

  toggleAddForm: function () {
    this.setData({ showAddForm: !this.data.showAddForm });
  },

  onDishName: function (e) {
    this.setData({ dishName: e.detail.value || '' });
  },

  onDishPrice: function (e) {
    this.setData({ dishPrice: e.detail.value || '' });
  },

  onDishCat: function (e) {
    this.setData({ dishCat: Number(e.currentTarget.dataset.id || 1) });
  },

  onDishTag: function (e) {
    this.setData({ dishTag: e.detail.value || '' });
  },

  addDish: function () {
    var name = this.data.dishName.trim();
    var price = Number(this.data.dishPrice);

    if (!name) {
      wx.showToast({ title: '请输入菜名', icon: 'none' });
      return;
    }

    if (!price || price <= 0) {
      wx.showToast({ title: '请输入有效价格', icon: 'none' });
      return;
    }

    var dish = menu.createCustomDish(name, price, this.data.dishCat, this.data.dishTag);
    storage.addCustomDish(dish);

    var that = this;
    api.addCustomDish(name, price, this.data.dishCat, this.data.dishTag).catch(function () {});

    this.setData({
      showAddForm: false,
      dishName: '',
      dishPrice: '',
      dishTag: '',
    });

    wx.showToast({ title: '已添加', icon: 'success' });
    setTimeout(function () {
      that.loadDishes();
    }, 50);
  },

  updateOrderStatus: function (orderId, status, toastTitle) {
    var that = this;

    api.updateOrderStatus(orderId, status).catch(function () {
      storage.updateOrderStatus(orderId, status);
    }).finally(function () {
      wx.showToast({ title: toastTitle, icon: 'success' });
      that.loadOrders();
    });
  },

  confirmOrder: function (e) {
    var that = this;
    var orderId = e.currentTarget.dataset.id;

    wx.showModal({
      title: '确认接单',
      content: '确认接单并开始制作吗？',
      success: function (res) {
        if (res.confirm) that.updateOrderStatus(orderId, 'confirmed', '已接单');
      },
    });
  },

  completeOrder: function (e) {
    var that = this;
    var orderId = e.currentTarget.dataset.id;

    wx.showModal({
      title: '完成出餐',
      content: '确认这笔订单已经完成吗？',
      success: function (res) {
        if (res.confirm) that.updateOrderStatus(orderId, 'completed', '已完成');
      },
    });
  },

  deleteDish: function (e) {
    var that = this;
    var dishId = e.currentTarget.dataset.id;

    wx.showModal({
      title: '删除菜品',
      content: '确认删除这道自定义菜品吗？',
      success: function (res) {
        if (!res.confirm) return;

        storage.deleteCustomDish(dishId);
        api.deleteDish(dishId).catch(function () {});
        that.loadDishes();
        wx.showToast({ title: '已删除', icon: 'success' });
      },
    });
  },
});
