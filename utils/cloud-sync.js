// utils/cloud-sync.js - sync local business data with WeChat Cloud Database.

var storage = require('./storage');

// If your project has more than one cloud environment, fill in the env id here.
// Leave it empty to use the default cloud environment selected in DevTools.
var CLOUD_ENV_ID = '';
var COLLECTION = 'user_data';

var cloudInited = false;
var listenerRegistered = false;
var currentOpenid = '';
var syncTimer = null;
var syncingPromise = null;

function canUseCloud() {
  return typeof wx !== 'undefined' && wx.cloud && wx.cloud.init;
}

function initCloud() {
  if (!canUseCloud()) {
    storage.setSyncStatus('local', { error: '当前环境不支持微信云开发' });
    return false;
  }
  if (cloudInited) return true;
  var options = { traceUser: true };
  if (CLOUD_ENV_ID) options.env = CLOUD_ENV_ID;
  try {
    wx.cloud.init(options);
  } catch (e) {
    // wx.cloud.init can throw if another module already initialized cloud.
    console.warn('云开发初始化提示', e);
  }
  cloudInited = true;
  return true;
}

function registerDataListener() {
  if (listenerRegistered) return;
  listenerRegistered = true;
  storage.onDataChange(function () {
    queueSync();
  });
}

function callFunction(name, data) {
  return new Promise(function (resolve, reject) {
    wx.cloud.callFunction({
      name: name,
      data: data || {},
      success: resolve,
      fail: reject,
    });
  });
}

function ensureOpenid() {
  var meta = storage.getSyncMeta();
  if (currentOpenid) return Promise.resolve(currentOpenid);
  if (meta.openid) currentOpenid = meta.openid;
  if (currentOpenid) return Promise.resolve(currentOpenid);

  return callFunction('login').then(function (res) {
    var openid = res && res.result && res.result.openid;
    if (!openid) throw new Error('无法获取当前微信用户 openid');
    currentOpenid = openid;
    storage.setSyncIdentity(openid);
    return openid;
  });
}

function getDocId(openid) {
  return 'user_' + openid;
}

function isNotFoundError(err) {
  var msg = (err && (err.errMsg || err.message)) || '';
  return msg.indexOf('not exist') !== -1 ||
    msg.indexOf('does not exist') !== -1 ||
    msg.indexOf('not found') !== -1 ||
    err && err.errCode === 10001;
}

function getCollection() {
  return wx.cloud.database().collection(COLLECTION);
}

function fetchRemote(openid) {
  return new Promise(function (resolve, reject) {
    getCollection().doc(getDocId(openid)).get({
      success: function (res) { resolve(res.data || null); },
      fail: function (err) {
        if (isNotFoundError(err)) {
          resolve(null);
        } else {
          reject(err);
        }
      },
    });
  });
}

function saveRemote(openid, payload) {
  var db = wx.cloud.database();
  return new Promise(function (resolve, reject) {
    getCollection().doc(getDocId(openid)).set({
      data: {
        openid: openid,
        data: payload,
        dataUpdatedAt: payload.updatedAt || Date.now(),
        updatedAt: db.serverDate(),
      },
      success: resolve,
      fail: reject,
    });
  });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}

function itemKey(item) {
  return String(item.id || item.i || item.name || '') + '|' + String(item.specKey || '');
}

function mergeCart(remoteCart, localCart) {
  var result = [];
  var indexByKey = {};
  var lists = [arrayValue(remoteCart), arrayValue(localCart)];
  for (var l = 0; l < lists.length; l++) {
    for (var i = 0; i < lists[l].length; i++) {
      var item = clone(lists[l][i]);
      var key = itemKey(item);
      if (!key) continue;
      if (indexByKey[key] === undefined) {
        indexByKey[key] = result.length;
        result.push(item);
      } else {
        var old = result[indexByKey[key]];
        old.quantity = Math.max(Number(old.quantity || 0), Number(item.quantity || 0));
      }
    }
  }
  return result;
}

function orderWeight(order) {
  var map = { pending: 1, confirmed: 2, completed: 3 };
  return map[order && order.status] || 0;
}

function orderTime(order) {
  var value = order && (order.completeTime || order.confirmTime || order.createTime);
  var parsed = Date.parse(String(value || '').replace(/-/g, '/'));
  return isNaN(parsed) ? 0 : parsed;
}

function chooseOrder(oldOrder, newOrder) {
  if (orderWeight(newOrder) > orderWeight(oldOrder)) return newOrder;
  if (orderWeight(newOrder) < orderWeight(oldOrder)) return oldOrder;
  return orderTime(newOrder) >= orderTime(oldOrder) ? newOrder : oldOrder;
}

function mergeOrders(remoteOrders, localOrders) {
  var map = {};
  var result = [];
  var lists = [arrayValue(remoteOrders), arrayValue(localOrders)];
  for (var l = 0; l < lists.length; l++) {
    for (var i = 0; i < lists[l].length; i++) {
      var order = clone(lists[l][i]);
      if (!order.id) continue;
      if (map[order.id] === undefined) {
        map[order.id] = result.length;
        result.push(order);
      } else {
        result[map[order.id]] = chooseOrder(result[map[order.id]], order);
      }
    }
  }
  result.sort(function (a, b) { return orderTime(b) - orderTime(a); });
  return result;
}

function mergeByField(remoteItems, localItems, field) {
  var map = {};
  var result = [];
  var lists = [arrayValue(remoteItems), arrayValue(localItems)];
  for (var l = 0; l < lists.length; l++) {
    for (var i = 0; i < lists[l].length; i++) {
      var item = clone(lists[l][i]);
      var key = String(item[field] || '');
      if (!key) continue;
      if (map[key] === undefined) {
        map[key] = result.length;
        result.push(item);
      } else if (l === 1) {
        result[map[key]] = item;
      }
    }
  }
  return result;
}

function mergeTags(remoteTags, localTags) {
  var result = [];
  var lists = [arrayValue(remoteTags), arrayValue(localTags)];
  for (var l = 0; l < lists.length; l++) {
    for (var i = 0; i < lists[l].length; i++) {
      var name = String(lists[l][i] || '').replace(/^#+/, '').trim();
      if (name && result.indexOf(name) === -1) result.push(name);
    }
  }
  return result;
}

function mergeData(localData, remoteData) {
  var local = localData || {};
  var remote = remoteData || {};
  return {
    version: 1,
    cart: mergeCart(remote.cart, local.cart),
    orders: mergeOrders(remote.orders, local.orders),
    role: local.role || remote.role || 'customer',
    checkout: arrayValue(local.checkout).length > 0 ? arrayValue(local.checkout) : arrayValue(remote.checkout),
    customDishes: mergeByField(remote.customDishes, local.customDishes, 'i'),
    tags: mergeTags(remote.tags, local.tags),
    menuVersion: local.menuVersion || remote.menuVersion || '',
    updatedAt: Date.now(),
  };
}

function isDefaultTags(tags) {
  var defaults = ['招牌', '家常', '下饭', '清爽', '人气', '新品', '推荐'];
  tags = arrayValue(tags);
  if (tags.length !== defaults.length) return false;
  for (var i = 0; i < defaults.length; i++) {
    if (tags[i] !== defaults[i]) return false;
  }
  return true;
}

function isDemoOrder(order) {
  return order && (order.id === 'ORD1718000000001' || order.id === 'ORD1718000000002');
}

function hasRealLocalData(data) {
  if (arrayValue(data.cart).length > 0) return true;
  if (arrayValue(data.checkout).length > 0) return true;
  if (arrayValue(data.customDishes).length > 0) return true;
  if (!isDefaultTags(data.tags)) return true;
  var orders = arrayValue(data.orders);
  for (var i = 0; i < orders.length; i++) {
    if (!isDemoOrder(orders[i])) return true;
  }
  return false;
}

function uploadSnapshot(openid, data, action) {
  var payload = clone(data);
  payload.updatedAt = Date.now();
  return saveRemote(openid, payload).then(function () {
    storage.importData(payload);
    return { ok: true, action: action || 'uploaded', data: payload };
  });
}

function downloadSnapshot(remoteData) {
  storage.importData(remoteData);
  return Promise.resolve({ ok: true, action: 'downloaded', data: remoteData });
}

function resolveSync(openid, remoteDoc, options) {
  var mode = options && options.mode ? options.mode : 'auto';
  var remoteData = remoteDoc && remoteDoc.data ? remoteDoc.data : null;
  var localData = storage.exportData();
  var meta = storage.getSyncMeta();

  if (mode === 'upload') {
    return uploadSnapshot(openid, localData, 'uploaded');
  }

  if (mode === 'download') {
    if (!remoteData) throw new Error('云端还没有可恢复的数据');
    return downloadSnapshot(remoteData);
  }

  if (!remoteData) {
    return uploadSnapshot(openid, localData, 'uploaded');
  }

  if (meta.dirty) {
    var remoteUpdatedAt = Number(remoteData.updatedAt || remoteDoc.dataUpdatedAt || 0);
    var localUpdatedAt = Number(meta.localUpdatedAt || 0);
    if (remoteUpdatedAt > localUpdatedAt) {
      return uploadSnapshot(openid, mergeData(localData, remoteData), 'merged');
    }
    return uploadSnapshot(openid, localData, 'uploaded');
  }

  if (!meta.lastSyncAt && hasRealLocalData(localData)) {
    return uploadSnapshot(openid, mergeData(localData, remoteData), 'merged');
  }

  return downloadSnapshot(remoteData);
}

function normalizeError(err) {
  var msg = (err && (err.errMsg || err.message)) || String(err || '未知错误');
  return msg.replace(/^cloud\.callFunction:fail\s*/i, '');
}

function sync(options) {
  options = options || {};
  if (!initCloud()) return Promise.reject(new Error('当前环境不支持微信云开发'));
  registerDataListener();
  if (syncingPromise) return syncingPromise;

  storage.setSyncStatus('syncing', { error: '' });
  syncingPromise = ensureOpenid()
    .then(function (openid) {
      return fetchRemote(openid).then(function (remoteDoc) {
        return resolveSync(openid, remoteDoc, options);
      });
    })
    .then(function (result) {
      storage.setSyncStatus('synced', { error: '' });
      return result;
    }, function (err) {
      storage.setSyncStatus('error', { error: normalizeError(err) });
      throw err;
    });

  syncingPromise.then(function () {
    syncingPromise = null;
  }, function () {
    syncingPromise = null;
  });

  return syncingPromise;
}

function queueSync(delay) {
  if (!canUseCloud()) return;
  registerDataListener();
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(function () {
    sync({ mode: 'auto' }).catch(function (err) {
      console.warn('自动同步失败', err);
    });
  }, delay || 1200);
}

function init() {
  if (!initCloud()) return Promise.resolve({ ok: false, action: 'local' });
  registerDataListener();
  return sync({ mode: 'auto' }).catch(function (err) {
    console.warn('启动同步失败', err);
    return { ok: false, action: 'error', error: normalizeError(err) };
  });
}

function maskOpenid(openid) {
  if (!openid) return '未连接';
  if (openid.length <= 10) return openid;
  return openid.slice(0, 6) + '...' + openid.slice(-4);
}

module.exports = {
  init: init,
  sync: sync,
  queueSync: queueSync,
  canUseCloud: canUseCloud,
  maskOpenid: maskOpenid,
};
