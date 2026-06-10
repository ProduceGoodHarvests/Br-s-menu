// pages/cart/cart.js
Page({
  data: {
    cartItems: [],
    totalPrice: 0,
    allChecked: true,
    isEmpty: true,
  },

  onShow: function () {
    this.loadCart();
  },

  loadCart: function () {
    const cart = wx.getStorageSync('cart') || [];
    const cartItems = cart.map(item => ({
      ...item,
      checked: true,
    }));

    const isEmpty = cartItems.length === 0;

    this.setData({
      cartItems,
      isEmpty,
      allChecked: !isEmpty,
    });

    this.calcTotal();
  },

  // 计算总价
  calcTotal: function () {
    const items = this.data.cartItems;
    let total = 0;
    items.forEach(item => {
      if (item.checked) {
        total += item.price * item.quantity;
      }
    });
    this.setData({ totalPrice: total.toFixed(2) });
  },

  // 切换选中
  toggleCheck: function (e) {
    const index = e.currentTarget.dataset.index;
    const cartItems = this.data.cartItems;
    cartItems[index].checked = !cartItems[index].checked;

    const allChecked = cartItems.every(item => item.checked);

    this.setData({ cartItems, allChecked });
    this.calcTotal();
  },

  // 全选/取消全选
  toggleAll: function () {
    const allChecked = !this.data.allChecked;
    const cartItems = this.data.cartItems.map(item => ({
      ...item,
      checked: allChecked,
    }));

    this.setData({ cartItems, allChecked });
    this.calcTotal();
  },

  // 改变数量
  changeQty: function (e) {
    const index = e.currentTarget.dataset.index;
    const action = e.currentTarget.dataset.action;
    const cartItems = this.data.cartItems;

    if (action === 'minus') {
      if (cartItems[index].quantity <= 1) return;
      cartItems[index].quantity -= 1;
    } else {
      cartItems[index].quantity += 1;
    }

    this.setData({ cartItems });
    this.saveCart();
    this.calcTotal();
  },

  // 删除商品
  deleteItem: function (e) {
    const index = e.currentTarget.dataset.index;

    wx.showModal({
      title: '提示',
      content: '确定要删除该商品吗？',
      success: (res) => {
        if (res.confirm) {
          const cartItems = this.data.cartItems;
          cartItems.splice(index, 1);
          this.setData({ cartItems });
          this.saveCart();
          this.calcTotal();

          if (cartItems.length === 0) {
            this.setData({ isEmpty: true, allChecked: false });
          }
        }
      },
    });
  },

  // 保存购物车到本地
  saveCart: function () {
    const cart = this.data.cartItems.map(item => ({
      id: item.id,
      name: item.name,
      icon: item.icon,
      price: item.price,
      specs: item.specs,
      specKey: item.specKey,
      quantity: item.quantity,
    }));
    wx.setStorageSync('cart', cart);
  },

  // 去结算
  checkout: function () {
    const checkedItems = this.data.cartItems.filter(item => item.checked);
    if (checkedItems.length === 0) {
      wx.showToast({ title: '请选择要结算的商品', icon: 'none' });
      return;
    }

    // 把选中的商品暂存，传递到结算页
    wx.setStorageSync('checkoutItems', checkedItems);
    wx.navigateTo({
      url: '/pages/checkout/checkout',
    });
  },

  // 去点餐
  goOrder: function () {
    wx.switchTab({
      url: '/pages/index/index',
    });
  },
});
