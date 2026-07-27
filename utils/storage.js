var KEYS = {
  CART: 'restaurant_cart_v2',
  CHECKOUT: 'restaurant_checkout_v2',
  CHECKOUT_REQUEST: 'restaurant_checkout_request_v1',
  ORDER_CONTEXT: 'restaurant_order_context_v2',
  MENU_CACHE: 'restaurant_menu_cache_v2',
  OPEN_RECHARGE: 'restaurant_open_recharge_v1',
};

function get(key, fallback) {
  var value = wx.getStorageSync(key);
  return value === '' || value === undefined || value === null ? fallback : value;
}

function set(key, value) { wx.setStorageSync(key, value); }
function remove(key) { wx.removeStorageSync(key); }

function getCart() {
  var cart = get(KEYS.CART, []);
  return Array.isArray(cart) ? cart : [];
}

function setCart(cart) { set(KEYS.CART, Array.isArray(cart) ? cart : []); }
function clearCart() { remove(KEYS.CART); }
function getCheckout() { var value = get(KEYS.CHECKOUT, []); return Array.isArray(value) ? value : []; }
function newRequestId() {
  return (Date.now().toString(36) + Math.random().toString(36).slice(2, 12)).replace(/[^a-z0-9_-]/gi, '').slice(0, 32);
}
function setCheckout(value) {
  var nextValue = Array.isArray(value) ? value : [];
  var currentValue = getCheckout();
  var currentRequestId = String(get(KEYS.CHECKOUT_REQUEST, '') || '');
  set(KEYS.CHECKOUT, nextValue);
  if (JSON.stringify(currentValue) !== JSON.stringify(nextValue) || !/^[A-Za-z0-9_-]{8,80}$/.test(currentRequestId)) {
    set(KEYS.CHECKOUT_REQUEST, newRequestId());
  }
}
function getCheckoutRequestId() {
  var requestId = String(get(KEYS.CHECKOUT_REQUEST, '') || '');
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(requestId)) {
    requestId = newRequestId();
    set(KEYS.CHECKOUT_REQUEST, requestId);
  }
  return requestId;
}
function clearCheckout() { remove(KEYS.CHECKOUT); remove(KEYS.CHECKOUT_REQUEST); }

function getOrderContext() {
  var value = get(KEYS.ORDER_CONTEXT, {});
  return { type: value.type || 'dine_in', tableNo: value.tableNo || '' };
}

function setOrderContext(value) {
  var current = getOrderContext();
  set(KEYS.ORDER_CONTEXT, {
    type: value && value.type ? value.type : current.type,
    tableNo: value && value.tableNo !== undefined ? value.tableNo : current.tableNo,
  });
}

function setMenuCache(menu) { set(KEYS.MENU_CACHE, menu || { categories: [], dishes: [] }); }
function getMenuCache() { return get(KEYS.MENU_CACHE, { categories: [], dishes: [] }); }
function requestRechargeOpen() { set(KEYS.OPEN_RECHARGE, true); }
function consumeRechargeOpen() {
  var shouldOpen = get(KEYS.OPEN_RECHARGE, false) === true;
  if (shouldOpen) remove(KEYS.OPEN_RECHARGE);
  return shouldOpen;
}

function cartKey(goodsId, selections) {
  var keys = Object.keys(selections || {}).sort();
  var parts = [];
  for (var i = 0; i < keys.length; i++) parts.push(keys[i] + ':' + selections[keys[i]]);
  return String(goodsId) + '|' + parts.join('|');
}

function addCartItem(dish, quantity, selections) {
  var cart = getCart();
  var key = cartKey(dish._id, selections);
  var found = false;
  for (var i = 0; i < cart.length; i++) {
    if (cart[i].cartKey === key) {
      cart[i].quantity = Math.min(99, Number(cart[i].quantity || 0) + Number(quantity || 1));
      found = true;
      break;
    }
  }
  if (!found) {
    cart.push({
      cartKey: key,
      goodsId: dish._id,
      name: dish.name,
      img: dish.img || '',
      price: Number(dish.price || 0),
      quantity: Number(quantity || 1),
      specSelections: selections || {},
    });
  }
  setCart(cart);
  return cart;
}

function toGoodsList(items) {
  var list = [];
  for (var i = 0; i < (items || []).length; i++) {
    list.push({ goodsId: items[i].goodsId, quantity: Number(items[i].quantity || 0), specSelections: items[i].specSelections || {} });
  }
  return list;
}

module.exports = {
  getCart: getCart,
  setCart: setCart,
  clearCart: clearCart,
  getCheckout: getCheckout,
  getCheckoutRequestId: getCheckoutRequestId,
  setCheckout: setCheckout,
  clearCheckout: clearCheckout,
  getOrderContext: getOrderContext,
  setOrderContext: setOrderContext,
  setMenuCache: setMenuCache,
  getMenuCache: getMenuCache,
  requestRechargeOpen: requestRechargeOpen,
  consumeRechargeOpen: consumeRechargeOpen,
  addCartItem: addCartItem,
  toGoodsList: toGoodsList,
  cartKey: cartKey,
};
