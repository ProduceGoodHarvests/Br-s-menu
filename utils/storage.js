var KEYS = {
  CART: 'food_cart',
  ORDERS: 'food_orders',
  ROLE: 'app_role',
  LOGIN: 'app_login',
  CHECKOUT: 'food_checkout',
  CUSTOM_DISHES: 'food_custom_dishes',
  LEGACY_CUSTOM_DISHES: 'food_custom',
};

function get(key, fallback) {
  var value = wx.getStorageSync(key);
  return value === '' || value === undefined || value === null ? fallback : value;
}

function set(key, value) {
  wx.setStorageSync(key, value);
}

function remove(key) {
  wx.removeStorageSync(key);
}

function getCart() {
  var cart = get(KEYS.CART, []);
  return Array.isArray(cart) ? cart : [];
}

function setCart(cart) {
  set(KEYS.CART, Array.isArray(cart) ? cart : []);
}

function clearCart() {
  setCart([]);
}

function getOrders() {
  var orders = get(KEYS.ORDERS, []);
  return Array.isArray(orders) ? orders : [];
}

function setOrders(orders) {
  set(KEYS.ORDERS, Array.isArray(orders) ? orders : []);
}

function addOrder(order) {
  var orders = getOrders();
  orders.unshift(order);
  setOrders(orders);
  return orders;
}

function updateOrderStatus(orderId, status) {
  var orders = getOrders();

  for (var i = 0; i < orders.length; i++) {
    if (orders[i].id === orderId || orders[i]._id === orderId) {
      orders[i].status = status;
      break;
    }
  }

  setOrders(orders);
  return orders;
}

function getRole() {
  return get(KEYS.ROLE, 'customer');
}

function setRole(role) {
  set(KEYS.ROLE, role === 'merchant' ? 'merchant' : 'customer');
}

function getLoginInfo() {
  return get(KEYS.LOGIN, null);
}

function setLoginInfo(info) {
  set(KEYS.LOGIN, info || {});
}

function clearLoginInfo() {
  remove(KEYS.LOGIN);
}

function getCheckout() {
  var items = get(KEYS.CHECKOUT, []);
  return Array.isArray(items) ? items : [];
}

function setCheckout(items) {
  set(KEYS.CHECKOUT, Array.isArray(items) ? items : []);
}

function clearCheckout() {
  remove(KEYS.CHECKOUT);
}

function getCustomDishes() {
  var dishes = get(KEYS.CUSTOM_DISHES, []);
  if ((!Array.isArray(dishes) || dishes.length === 0) && get(KEYS.LEGACY_CUSTOM_DISHES, []).length) {
    dishes = get(KEYS.LEGACY_CUSTOM_DISHES, []);
  }
  return Array.isArray(dishes) ? dishes : [];
}

function setCustomDishes(dishes) {
  set(KEYS.CUSTOM_DISHES, Array.isArray(dishes) ? dishes : []);
}

function addCustomDish(dish) {
  var dishes = getCustomDishes();
  dishes.unshift(dish);
  setCustomDishes(dishes);
  return dishes;
}

function deleteCustomDish(dishId) {
  var dishes = getCustomDishes();
  var kept = [];

  for (var i = 0; i < dishes.length; i++) {
    if (String(dishes[i].i) !== String(dishId) && String(dishes[i]._id) !== String(dishId)) {
      kept.push(dishes[i]);
    }
  }

  setCustomDishes(kept);
  return kept;
}

function seedDemoOrders() {
  var orders = getOrders();
  if (orders.length > 0) return;

  setOrders([
    {
      id: 'ORD20260608001',
      table: 'A01 桌 大厅',
      items: [
        { name: '冷吃牛肉', price: 32, quantity: 1, subtotal: '32.00', specs: [{ name: '辣度', value: '中辣' }] },
        { name: '番茄炒鸡蛋', price: 18, quantity: 1, subtotal: '18.00', specs: [] },
      ],
      totalPrice: '50.00',
      remark: '少油',
      status: 'completed',
      createTime: '2026-06-08 12:30',
    },
    {
      id: 'ORD20260609001',
      table: 'B02 桌 靠窗',
      items: [
        { name: '水煮鱼片', price: 48, quantity: 1, subtotal: '48.00', specs: [{ name: '辣度', value: '微辣' }] },
      ],
      totalPrice: '48.00',
      remark: '',
      status: 'pending',
      createTime: '2026-06-09 18:45',
    },
  ]);
}

module.exports = {
  getCart: getCart,
  setCart: setCart,
  clearCart: clearCart,
  getOrders: getOrders,
  setOrders: setOrders,
  addOrder: addOrder,
  updateOrderStatus: updateOrderStatus,
  getRole: getRole,
  setRole: setRole,
  getLoginInfo: getLoginInfo,
  setLoginInfo: setLoginInfo,
  clearLoginInfo: clearLoginInfo,
  getCheckout: getCheckout,
  setCheckout: setCheckout,
  clearCheckout: clearCheckout,
  getCustomDishes: getCustomDishes,
  setCustomDishes: setCustomDishes,
  addCustomDish: addCustomDish,
  deleteCustomDish: deleteCustomDish,
  seedDemoOrders: seedDemoOrders,
};
