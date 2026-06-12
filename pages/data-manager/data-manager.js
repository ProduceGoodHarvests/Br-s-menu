var storage = require('../../utils/storage');
var cloudSync = require('../../utils/cloud-sync');

function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

function formatTime(ts) {
  if (!ts) return '未同步';
  var d = new Date(ts);
  if (isNaN(d.getTime())) return '未同步';
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function errorText(err) {
  return (err && (err.errMsg || err.message)) || String(err || '未知错误');
}

function syncActionText(action) {
  if (action === 'downloaded') return '已从云端恢复';
  if (action === 'uploaded') return '已上传本机数据';
  if (action === 'merged') return '已合并并同步';
  return '同步完成';
}

Page({
  data: {
    cartCount: 0,
    cartKindCount: 0,
    orderCount: 0,
    customDishCount: 0,
    tagCount: 0,
    cloudSupported: true,
    syncStatus: 'local',
    syncStatusText: '未同步',
    syncDesc: '',
    accountText: '未连接',
    lastSyncText: '未同步',
    errorText: '',
    syncing: false,
  },

  onShow: function () {
    this.refreshData();
  },

  refreshData: function () {
    var cart = storage.getCart();
    var cartCount = 0;
    for (var i = 0; i < cart.length; i++) cartCount += Number(cart[i].quantity || 0);

    var orders = storage.getOrders();
    var dishes = storage.getCustomDishes();
    var tags = storage.getDishTags();
    var meta = storage.getSyncMeta();
    var cloudSupported = cloudSync.canUseCloud();
    var status = meta.status || (meta.dirty ? 'pending' : 'local');
    if (!cloudSupported) status = 'local';

    var statusText = '未同步';
    var desc = '同一微信号登录后，可在不同手机恢复云端数据。';
    if (!cloudSupported) {
      statusText = '仅本机';
      desc = '当前环境不支持微信云开发，数据只保存在本机。';
    } else if (status === 'syncing') {
      statusText = '同步中';
      desc = '正在连接云端数据。';
    } else if (status === 'error') {
      statusText = '同步失败';
      desc = meta.error || '请确认已开通云开发、创建 user_data 集合并部署 login 云函数。';
    } else if (meta.dirty) {
      statusText = '待同步';
      desc = '本机有新改动，会自动上传，也可以手动立即同步。';
      status = 'pending';
    } else if (status === 'synced') {
      statusText = '已同步';
      desc = '上次同步：' + formatTime(meta.lastSyncAt);
    }

    this.setData({
      cartCount: cartCount,
      cartKindCount: cart.length,
      orderCount: orders.length,
      customDishCount: dishes.length,
      tagCount: tags.length,
      cloudSupported: cloudSupported,
      syncStatus: status,
      syncStatusText: statusText,
      syncDesc: desc,
      accountText: cloudSync.maskOpenid(meta.openid),
      lastSyncText: formatTime(meta.lastSyncAt),
      errorText: meta.error || '',
    });
  },

  runSync: function (options, loadingTitle) {
    if (this.data.syncing) return;
    if (!cloudSync.canUseCloud()) {
      wx.showModal({
        title: '无法同步',
        content: '当前基础库或运行环境不支持微信云开发，请在微信开发者工具中开通云开发后再试。',
        showCancel: false,
      });
      return;
    }

    var that = this;
    this.setData({ syncing: true });
    storage.setSyncStatus('syncing', { error: '' });
    this.refreshData();
    wx.showLoading({ title: loadingTitle || '同步中' });

    cloudSync.sync(options || { mode: 'auto' }).then(function (res) {
      wx.hideLoading();
      that.setData({ syncing: false });
      that.refreshData();
      wx.showToast({ title: syncActionText(res && res.action), icon: 'success' });
    }, function (err) {
      wx.hideLoading();
      that.setData({ syncing: false });
      that.refreshData();
      wx.showModal({
        title: '同步失败',
        content: errorText(err),
        showCancel: false,
      });
    });
  },

  syncNow: function () {
    this.runSync({ mode: 'auto' }, '同步中');
  },

  uploadLocal: function () {
    var that = this;
    wx.showModal({
      title: '上传本机数据',
      content: '本机数据会覆盖云端备份。适合这台手机的数据最新、需要同步到其他手机时使用。',
      confirmText: '上传',
      success: function (res) {
        if (res.confirm) that.runSync({ mode: 'upload' }, '上传中');
      },
    });
  },

  downloadCloud: function () {
    var that = this;
    wx.showModal({
      title: '从云端恢复',
      content: '云端备份会覆盖本机数据。适合换手机、重装后恢复订单和菜品时使用。',
      confirmText: '恢复',
      success: function (res) {
        if (res.confirm) that.runSync({ mode: 'download' }, '恢复中');
      },
    });
  },

  clearLocal: function () {
    var that = this;
    wx.showModal({
      title: '清空数据',
      content: '会清空本机购物车、订单、自定义菜品和标签，并把这个清空结果同步到云端。此操作不可撤销。',
      confirmText: '清空',
      confirmColor: '#d93026',
      success: function (res) {
        if (!res.confirm) return;
        storage.clearBusinessData();
        cloudSync.queueSync(100);
        that.refreshData();
        wx.showToast({ title: '已清空', icon: 'success' });
      },
    });
  },
});
