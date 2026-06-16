var storage = require('./storage');

var cloudReady = false;
var initialized = false;

function init() {
  if (initialized) return cloudReady;
  initialized = true;

  if (typeof wx === 'undefined' || !wx.cloud) {
    cloudReady = false;
    return cloudReady;
  }

  try {
    wx.cloud.init({ traceUser: true });
    cloudReady = true;
  } catch (err) {
    console.warn('云开发初始化失败', err);
    cloudReady = false;
  }

  return cloudReady;
}

function call(name, data) {
  return new Promise(function (resolve, reject) {
    if (!init()) {
      reject(new Error('云开发未启用'));
      return;
    }

    wx.cloud.callFunction({
      name: name,
      data: data || {},
    }).then(function (res) {
      var result = res.result || {};
      if (result.ok === false) {
        reject(result);
      } else {
        resolve(result);
      }
    }).catch(reject);
  });
}

function submitOrder(order) {
  return call('orderManager', { action: 'submit', order: order });
}

function updateOrderStatus(orderId, status) {
  return call('orderManager', { action: 'updateStatus', orderId: orderId, status: status });
}

function getOrders(filter, pageSize, page) {
  return call('orderManager', {
    action: 'list',
    filter: filter || '',
    pageSize: pageSize || 30,
    page: page || 1,
    role: storage.getRole(),
  });
}

function getCategories() {
  return call('menuManager', { action: 'categories' });
}

function getDishes(categoryId, page, keyword) {
  return call('menuManager', {
    action: 'list',
    categoryId: categoryId || 0,
    pageSize: 50,
    page: page || 1,
    keyword: keyword || '',
  });
}

function addCustomDish(name, price, categoryId, tag) {
  return call('menuManager', {
    action: 'add',
    name: name,
    price: price,
    categoryId: categoryId,
    tag: tag || '',
  });
}

function deleteDish(dishId) {
  return call('menuManager', { action: 'delete', dishId: dishId });
}

module.exports = {
  init: init,
  call: call,
  submitOrder: submitOrder,
  updateOrderStatus: updateOrderStatus,
  getOrders: getOrders,
  getCategories: getCategories,
  getDishes: getDishes,
  addCustomDish: addCustomDish,
  deleteDish: deleteDish,
};
