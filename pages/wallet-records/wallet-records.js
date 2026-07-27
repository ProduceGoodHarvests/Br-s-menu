var api = require('../../utils/cloud-api');
var format = require('../../utils/format');

var TYPE_META = {
  consume: { label: '消费', icon: '−', className: 'consume' },
  recharge: { label: '充值', icon: '+', className: 'recharge' },
  refund: { label: '退款', icon: '↺', className: 'refund' },
  adjustment: { label: '余额调整', icon: '±', className: 'adjustment' }
};

function normalize(record) {
  var item = Object.assign({}, record || {});
  var amount = Number(item.amount || 0);
  var meta = TYPE_META[item.type] || TYPE_META.adjustment;
  item.typeLabel = meta.label;
  item.icon = meta.icon;
  item.typeClass = meta.className;
  item.amountClass = amount > 0 ? 'income' : (amount < 0 ? 'expense' : 'pending');
  item.amountText = (amount > 0 ? '+' : '') + amount.toFixed(2) + ' 金币';
  item.timeText = format.formatDateTime(item.time);
  item.statusText = { paid: '已到账', completed: '已完成', pending: '待支付', failed: '已关闭', expired: '已过期' }[item.status] || '';
  item.canOpenOrder = !!item.orderId;
  return item;
}

Page({
  data: {
    loading: true,
    error: '',
    balanceText: '0.00',
    records: [],
    visibleRecords: [],
    activeTab: 'all',
    tabs: [{ value: 'all', label: '全部' }, { value: 'consume', label: '消费' }, { value: 'recharge', label: '充值' }, { value: 'refund', label: '退款' }, { value: 'adjustment', label: '调整' }]
  },

  onLoad: function () { this.loadRecords(); },
  onShow: function () { if (!this.data.loading) this.loadRecords(true); },

  loadRecords: function (silent) {
    var that = this;
    var requestId = (this.requestId || 0) + 1;
    this.requestId = requestId;
    if (!silent) this.setData({ loading: true, error: '' });
    return api.getWalletRecords().then(function (result) {
      if (requestId !== that.requestId) return;
      var records = [];
      for (var i = 0; i < (result.records || []).length; i++) records.push(normalize(result.records[i]));
      that.allRecords = records;
      that.setData({ balanceText: Number(result.balance || 0).toFixed(2), records: records, loading: false, error: '' });
      that.applyFilter();
    }).catch(function (err) {
      if (requestId !== that.requestId) return;
      that.setData({ loading: false, error: err.msg || '消费记录加载失败，请稍后重试' });
    });
  },

  switchTab: function (e) {
    this.setData({ activeTab: e.currentTarget.dataset.value });
    this.applyFilter();
  },

  applyFilter: function () {
    var tab = this.data.activeTab;
    var source = this.allRecords || this.data.records || [];
    this.setData({ visibleRecords: source.filter(function (item) { return tab === 'all' || item.type === tab; }) });
  },

  retryLoad: function () { this.loadRecords(); },
  onPullDownRefresh: function () { this.loadRecords().finally(function () { wx.stopPullDownRefresh(); }); },

  goOrderDetail: function (e) {
    var orderId = e.currentTarget.dataset.id;
    if (orderId) wx.navigateTo({ url: '/pages/order-detail/order-detail?id=' + encodeURIComponent(orderId) });
  },

  onUnload: function () { this.requestId = (this.requestId || 0) + 1; }
});
