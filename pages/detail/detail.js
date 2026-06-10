// pages/detail/detail.js
const mock = require('../../utils/mock-data');

Page({
  data: {
    food: null,
    quantity: 1,
    selectedSpecs: {}, // { specName: optionValue }
    totalPrice: 0,
  },

  onLoad: function (options) {
    const foodId = parseInt(options.id);
    const food = mock.getFoodById(foodId);

    if (!food) {
      wx.showToast({ title: '菜品不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    // 初始化规格选择（默认选第一个）
    const selectedSpecs = {};
    if (food.specs && food.specs.length > 0) {
      food.specs.forEach(spec => {
        selectedSpecs[spec.name] = spec.options[0];
      });
    }

    this.setData({
      food: food,
      selectedSpecs: selectedSpecs,
      totalPrice: food.price,
    });
  },

  // 选择规格
  selectSpec: function (e) {
    const specName = e.currentTarget.dataset.spec;
    const optionValue = e.currentTarget.dataset.value;

    const selectedSpecs = { ...this.data.selectedSpecs, [specName]: optionValue };
    this.setData({ selectedSpecs });

    // 重新计算价格（如果有加价选项）
    this.calcTotalPrice();
  },

  // 计算总价
  calcTotalPrice: function () {
    const food = this.data.food;
    let price = food.price;

    // 检查是否有加价选项
    Object.entries(this.data.selectedSpecs).forEach(([name, value]) => {
      const match = value.match(/\+¥(\d+)/);
      if (match) {
        price += parseInt(match[1]);
      }
    });

    this.setData({ totalPrice: price * this.data.quantity });
  },

  // 减少数量
  decreaseQty: function () {
    if (this.data.quantity <= 1) return;
    const qty = this.data.quantity - 1;
    this.setData({ quantity: qty });
    this.calcTotalPrice();
  },

  // 增加数量
  increaseQty: function () {
    const qty = this.data.quantity + 1;
    this.setData({ quantity: qty });
    this.calcTotalPrice();
  },

  // 加入购物车
  addToCart: function () {
    const food = this.data.food;
    let cart = wx.getStorageSync('cart') || [];

    // 生成一个唯一标识（id + 规格组合）
    const specsArray = Object.entries(this.data.selectedSpecs).map(([name, value]) => ({
      name,
      value,
    }));
    const specKey = specsArray.map(s => s.name + ':' + s.value).join('|');

    // 查找是否已存在相同规格的商品
    const existingIndex = cart.findIndex(item =>
      item.id === food.id &&
      (item.specKey || '') === specKey
    );

    if (existingIndex > -1) {
      cart[existingIndex].quantity += this.data.quantity;
    } else {
      cart.push({
        id: food.id,
        name: food.name,
        icon: food.icon,
        price: this.data.totalPrice / this.data.quantity, // 单价
        specs: specsArray,
        specKey: specKey,
        quantity: this.data.quantity,
      });
    }

    wx.setStorageSync('cart', cart);

    wx.showToast({
      title: '已加入购物车',
      icon: 'success',
    });
  },

  // 立即购买
  buyNow: function () {
    this.addToCart();
    wx.switchTab({
      url: '/pages/cart/cart',
    });
  },

  // 去购物车
  goCart: function () {
    wx.switchTab({
      url: '/pages/cart/cart',
    });
  },
});
