// utils/storage.js — 统一本地存储管理

var KEYS = {
  CART: 'food_cart',
  ORDERS: 'food_orders',
  ROLE: 'app_role',       // 'customer' | 'merchant'
  CHECKOUT: 'food_checkout',
  CUSTOM: 'food_custom',
  MENU_VERSION: 'food_menu_version',
};

// 通用读写
function get(key, fallback) {
  var val = wx.getStorageSync(key);
  if (val === '' || val === undefined || val === null) return fallback;
  return val;
}

function set(key, value) {
  wx.setStorageSync(key, value);
}

function remove(key) {
  wx.removeStorageSync(key);
}

// --- 购物车 ---
function getCart() {
  var cart = get(KEYS.CART, []);
  if (!Array.isArray(cart)) cart = [];
  return cart;
}

function setCart(cart) {
  set(KEYS.CART, cart);
}

function clearCart() {
  set(KEYS.CART, []);
}

// --- 订单 ---
function getOrders() {
  var orders = get(KEYS.ORDERS, []);
  if (!Array.isArray(orders)) orders = [];
  return orders;
}

function setOrders(orders) {
  set(KEYS.ORDERS, orders);
}

function addOrder(order) {
  var orders = getOrders();
  orders.unshift(order);
  setOrders(orders);
  return orders;
}

function updateOrderStatus(orderId, newStatus) {
  var orders = getOrders();
  for (var i = 0; i < orders.length; i++) {
    if (orders[i].id === orderId) {
      orders[i].status = newStatus;
      if (newStatus === 'confirmed') orders[i].confirmTime = formatNow();
      if (newStatus === 'completed') orders[i].completeTime = formatNow();
      break;
    }
  }
  setOrders(orders);
  return orders;
}

// --- 角色 ---
function getRole() {
  return get(KEYS.ROLE, 'customer');
}

function setRole(role) {
  set(KEYS.ROLE, role);
}

// --- 结算暂存 ---
function getCheckout() {
  return get(KEYS.CHECKOUT, []);
}

function setCheckout(items) {
  set(KEYS.CHECKOUT, items);
}

function clearCheckout() {
  remove(KEYS.CHECKOUT);
}

// --- 自定义菜品 ---
function getCustomDishes() {
  var d = get(KEYS.CUSTOM, []);
  if (!Array.isArray(d)) d = [];
  return d;
}
function setCustomDishes(dishes) { set(KEYS.CUSTOM, dishes); }

function ensureMenuVersion(version) {
  if (get(KEYS.MENU_VERSION, '') !== version) {
    setCustomDishes([]);
    clearCart();
    clearCheckout();
    setOrders([]);
    set(KEYS.MENU_VERSION, version);
  }
}

// --- 工具 ---
function formatNow() {
  var d = new Date();
  return d.getFullYear() + '-' +
    pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
    pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

// 预置演示订单（首次使用）
function seedDemoOrders() {
  var orders = getOrders();
  if (orders.length === 0) {
    orders = [
      {
        id: 'ORD1718000000001',
        table: 'B02 桌 B区靠窗',
        items: [
          { name: '冷吃牛肉', price: 32, quantity: 1, subtotal: '32.00', specs: [{ name: '辣度', value: '中辣' }] },
          { name: '番茄炒鸡蛋', price: 18, quantity: 1, subtotal: '18.00', specs: [] },
        ],
        totalPrice: '50.00', remark: '',
        status: 'completed', createTime: '2026-06-08 12:30',
        confirmTime: '2026-06-08 12:35', completeTime: '2026-06-08 12:50',
      },
      {
        id: 'ORD1718000000002',
        table: 'A01 桌 A区大厅',
        items: [
          { name: '青椒炒肉', price: 26, quantity: 1, subtotal: '26.00', specs: [{ name: '辣度', value: '微辣' }] },
          { name: '素炒小白菜', price: 16, quantity: 1, subtotal: '16.00', specs: [] },
        ],
        totalPrice: '42.00', remark: '少放盐',
        status: 'pending', createTime: '2026-06-09 18:45',
      },
    ];
    setOrders(orders);
  }
}

module.exports = {
  getCart: getCart, setCart: setCart, clearCart: clearCart,
  getOrders: getOrders, setOrders: setOrders,
  addOrder: addOrder, updateOrderStatus: updateOrderStatus,
  getRole: getRole, setRole: setRole,
  getCheckout: getCheckout, setCheckout: setCheckout, clearCheckout: clearCheckout,
  seedDemoOrders: seedDemoOrders, formatNow: formatNow,
  getCustomDishes: getCustomDishes, setCustomDishes: setCustomDishes,
  ensureMenuVersion: ensureMenuVersion,
};
