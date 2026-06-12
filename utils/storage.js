// utils/storage.js — 统一本地存储管理

var KEYS = {
  CART: 'food_cart',
  ORDERS: 'food_orders',
  ROLE: 'app_role',       // 'customer' | 'merchant'
  CHECKOUT: 'food_checkout',
  CUSTOM: 'food_custom',
  TAGS: 'food_tags',
  MENU_VERSION: 'food_menu_version',
  SYNC_META: 'food_sync_meta',
};

var DEFAULT_TAGS = ['招牌', '家常', '下饭', '清爽', '人气', '新品', '推荐'];
var SYNC_DATA_KEYS = [
  KEYS.CART,
  KEYS.ORDERS,
  KEYS.ROLE,
  KEYS.CHECKOUT,
  KEYS.CUSTOM,
  KEYS.TAGS,
  KEYS.MENU_VERSION,
];
var dirtySilentDepth = 0;
var changeListeners = [];

// 通用读写
function get(key, fallback) {
  var val = wx.getStorageSync(key);
  if (val === '' || val === undefined || val === null) return fallback;
  return val;
}

function set(key, value, options) {
  wx.setStorageSync(key, value);
  if (!options || !options.silent) markDirtyForKey(key);
}

function remove(key, options) {
  wx.removeStorageSync(key);
  if (!options || !options.silent) markDirtyForKey(key);
}

function isSyncDataKey(key) {
  return SYNC_DATA_KEYS.indexOf(key) !== -1;
}

function markDirtyForKey(key) {
  if (dirtySilentDepth > 0 || !isSyncDataKey(key)) return;
  markDirty();
}

function runWithoutDirty(fn) {
  dirtySilentDepth += 1;
  try {
    return fn();
  } finally {
    dirtySilentDepth -= 1;
  }
}

function notifyDataChange(meta) {
  for (var i = 0; i < changeListeners.length; i++) {
    try {
      changeListeners[i](meta);
    } catch (e) {
      console.warn('数据变更监听执行失败', e);
    }
  }
}

function onDataChange(listener) {
  if (typeof listener !== 'function') return function () {};
  changeListeners.push(listener);
  return function () {
    var next = [];
    for (var i = 0; i < changeListeners.length; i++) {
      if (changeListeners[i] !== listener) next.push(changeListeners[i]);
    }
    changeListeners = next;
  };
}

function getSyncMeta() {
  var meta = get(KEYS.SYNC_META, {});
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) meta = {};
  return meta;
}

function setSyncMeta(meta) {
  wx.setStorageSync(KEYS.SYNC_META, meta || {});
  return meta || {};
}

function markDirty() {
  var meta = getSyncMeta();
  var now = Date.now();
  meta.dirty = true;
  meta.localUpdatedAt = now;
  meta.status = 'pending';
  meta.error = '';
  setSyncMeta(meta);
  notifyDataChange(meta);
  return meta;
}

function markSynced(remoteUpdatedAt) {
  var meta = getSyncMeta();
  var now = Date.now();
  meta.dirty = false;
  meta.status = 'synced';
  meta.lastSyncAt = now;
  meta.remoteUpdatedAt = remoteUpdatedAt || meta.remoteUpdatedAt || now;
  meta.localUpdatedAt = meta.remoteUpdatedAt;
  meta.error = '';
  return setSyncMeta(meta);
}

function setSyncStatus(status, extra) {
  var meta = getSyncMeta();
  meta.status = status;
  if (extra) {
    for (var k in extra) meta[k] = extra[k];
  }
  return setSyncMeta(meta);
}

function setSyncIdentity(openid) {
  var meta = getSyncMeta();
  meta.openid = openid || '';
  return setSyncMeta(meta);
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

// --- 标签 ---
function normalizeTags(tags) {
  var result = [];
  if (!Array.isArray(tags)) return result;
  for (var i = 0; i < tags.length; i++) {
    var name = String(tags[i] || '').replace(/^#+/, '').trim();
    if (name && result.indexOf(name) === -1) result.push(name);
  }
  return result;
}

function getDishTags() {
  var tags = normalizeTags(get(KEYS.TAGS, DEFAULT_TAGS));
  if (tags.length === 0) tags = DEFAULT_TAGS.slice();
  return tags;
}

function setDishTags(tags) {
  var normalized = normalizeTags(tags);
  if (normalized.length === 0) normalized = DEFAULT_TAGS.slice();
  set(KEYS.TAGS, normalized);
  return normalized;
}

function addDishTag(tag) {
  var tags = getDishTags();
  var name = normalizeTags([tag])[0];
  if (name && tags.indexOf(name) === -1) tags.push(name);
  return setDishTags(tags);
}

function removeDishTag(tag) {
  var tags = getDishTags();
  var name = normalizeTags([tag])[0];
  var next = [];
  for (var i = 0; i < tags.length; i++) {
    if (tags[i] !== name) next.push(tags[i]);
  }
  return setDishTags(next);
}

function resetDishTags() {
  return setDishTags(DEFAULT_TAGS);
}

function ensureMenuVersion(version) {
  if (get(KEYS.MENU_VERSION, '') !== version) {
    runWithoutDirty(function () {
      set(KEYS.MENU_VERSION, version);
    });
  }
}

// --- 同步数据包 ---
function exportData() {
  return {
    version: 1,
    cart: getCart(),
    orders: getOrders(),
    role: getRole(),
    checkout: getCheckout(),
    customDishes: getCustomDishes(),
    tags: getDishTags(),
    menuVersion: get(KEYS.MENU_VERSION, ''),
    updatedAt: Date.now(),
  };
}

function importData(payload, options) {
  if (!payload || typeof payload !== 'object') return false;
  runWithoutDirty(function () {
    setCart(Array.isArray(payload.cart) ? payload.cart : []);
    setOrders(Array.isArray(payload.orders) ? payload.orders : []);
    setRole(payload.role === 'merchant' ? 'merchant' : 'customer');
    setCheckout(Array.isArray(payload.checkout) ? payload.checkout : []);
    setCustomDishes(Array.isArray(payload.customDishes) ? payload.customDishes : []);
    setDishTags(Array.isArray(payload.tags) ? payload.tags : DEFAULT_TAGS);
    set(KEYS.MENU_VERSION, payload.menuVersion || '');
  });
  if (options && options.markDirty) {
    markDirty();
  } else {
    markSynced(payload.updatedAt || Date.now());
  }
  return true;
}

function clearBusinessData() {
  clearCart();
  setOrders([]);
  clearCheckout();
  setCustomDishes([]);
  resetDishTags();
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
    runWithoutDirty(function () {
      setOrders(orders);
    });
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
  getDishTags: getDishTags, setDishTags: setDishTags,
  addDishTag: addDishTag, removeDishTag: removeDishTag, resetDishTags: resetDishTags,
  ensureMenuVersion: ensureMenuVersion,
  exportData: exportData, importData: importData, clearBusinessData: clearBusinessData,
  getSyncMeta: getSyncMeta, setSyncMeta: setSyncMeta,
  markDirty: markDirty, markSynced: markSynced,
  setSyncStatus: setSyncStatus, setSyncIdentity: setSyncIdentity,
  onDataChange: onDataChange,
};
