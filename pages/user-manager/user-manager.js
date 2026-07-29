var api = require('../../utils/cloud-api');
var format = require('../../utils/format');
var membership = require('../../utils/membership');

var STATUS_TABS = [
  { value: 'all', label: '全部' },
  { value: 'enabled', label: '正常' },
  { value: 'disabled', label: '已停用' }
];

var ADMIN_ROLES = [
  { value: 'operator', label: '运营管理员', desc: '可管理订单、菜品、分类、桌台、用户与打印' },
  { value: 'kitchen', label: '后厨人员', desc: '可处理订单和后厨打印' },
  { value: 'super_admin', label: '超级管理员', desc: '拥有全部权限，包括管理员分配' }
];

var ROLE_LABELS = {
  super_admin: '超级管理员',
  operator: '运营管理员',
  kitchen: '后厨人员'
};

function shortOpenid(openid) {
  openid = String(openid || '');
  if (openid.length <= 14) return openid;
  return openid.slice(0, 8) + '...' + openid.slice(-6);
}

function normalizeMember(item) {
  item.status = item.status !== false;
  item.statusText = item.status ? '正常' : '已停用';
  item.openidShort = shortOpenid(item.openid);
  item.timeText = format.formatDateTime(item.createTime);
  item.balanceText = Number(item.balance || 0).toFixed(2);
  item.levelText = 'LV' + Number(item.level || 1);
  item.levelName = item.levelName || membership.getMembership(item.score).name;
  item.discountText = item.discountText || membership.getMembership(item.score).discountText;
  item.displayName = item.nickname || item.openidShort;
  item.adminRoleText = item.admin ? (ROLE_LABELS[item.admin.role] || item.admin.role) : '';
  item.adminStatusText = item.admin && item.admin.status === false ? '已停用' : '';
  return item;
}

Page({
  data: {
    themeClass: getApp().getThemeClass(),
    themeAccent: getApp().getThemeAccent(),
    loading: true,
    loadingMore: false,
    saving: false,
    keyword: '',
    status: 'all',
    statusTabs: STATUS_TABS,
    members: [],
    page: 1,
    pageSize: 20,
    total: 0,
    hasMore: false,
    canManageAdmins: false,
    canGrantCoins: false,
    adminRoles: ADMIN_ROLES,
    adminEditing: false,
    adminSaving: false,
    adminMember: null,
    adminRole: 'operator',
    adminRoleIndex: 0,
    adminStatus: true,
    coinEditing: false,
    coinSaving: false,
    coinMember: null,
    coinMode: 'grant',
    coinAmount: '',
    coinReason: '',
    editing: false,
    currentMember: null,
      form: {
        level: 1,
        levelText: 'LV1 普通会员',
        score: 0,
      status: true,
      remark: ''
    }
  },

  onShow: function () {
    getApp().syncPageTheme(this);
  },

  onLoad: function () {
    this.loadMembers();
  },

  onPullDownRefresh: function () {
    this.loadMembers().finally(function () {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom: function () {
    if (this.data.hasMore && !this.data.loadingMore) this.loadMore();
  },

  loadMembers: function () {
    var that = this;
    this.setData({ loading: true, page: 1 });
    return api.adminMembers({
      page: 1,
      pageSize: this.data.pageSize,
      keyword: this.data.keyword,
      status: this.data.status
    }).then(function (res) {
      var members = (res.members || []).map(normalizeMember);
      that.setData({
        members: members,
        total: res.total || 0,
        page: 1,
        hasMore: !!res.hasMore,
        canManageAdmins: !!res.canManageAdmins,
        canGrantCoins: !!res.canGrantCoins,
        loading: false
      });
    }).catch(function (err) {
      wx.showToast({ title: err.msg || '用户加载失败', icon: 'none' });
      that.setData({ loading: false });
    });
  },

  loadMore: function () {
    var that = this;
    var nextPage = this.data.page + 1;
    this.setData({ loadingMore: true });
    api.adminMembers({
      page: nextPage,
      pageSize: this.data.pageSize,
      keyword: this.data.keyword,
      status: this.data.status
    }).then(function (res) {
      var more = (res.members || []).map(normalizeMember);
      that.setData({
        members: that.data.members.concat(more),
        page: nextPage,
        hasMore: !!res.hasMore,
        loadingMore: false
      });
    }).catch(function (err) {
      wx.showToast({ title: err.msg || '加载更多失败', icon: 'none' });
      that.setData({ loadingMore: false });
    });
  },

  onSearchInput: function (e) {
    var that = this;
    this.setData({ keyword: e.detail.value });
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(function () {
      that.loadMembers();
    }, 300);
  },

  clearSearch: function () {
    this.setData({ keyword: '' });
    this.loadMembers();
  },

  changeStatus: function (e) {
    var status = e.currentTarget.dataset.status;
    if (status === this.data.status) return;
    this.setData({ status: status });
    this.loadMembers();
  },

  copyOpenid: function (e) {
    var openid = e.currentTarget.dataset.openid;
    wx.setClipboardData({
      data: openid,
      success: function () { wx.showToast({ title: 'OpenID已复制', icon: 'success' }); }
    });
  },

  openCoinEdit: function (e) {
    if (!this.data.canGrantCoins) {
      return wx.showToast({ title: '当前账号没有用户管理权限', icon: 'none' });
    }
    var index = Number(e.currentTarget.dataset.index);
    var member = this.data.members[index];
    if (!member) return;
    this.setData({
      coinEditing: true,
      coinMember: member,
      coinMode: 'grant',
      coinAmount: '',
      coinReason: ''
    });
  },

  closeCoinEdit: function () {
    if (this.data.coinSaving) return;
    this.setData({ coinEditing: false, coinMember: null });
  },

  selectCoinMode: function (e) {
    this.setData({ coinMode: e.currentTarget.dataset.mode });
  },

  onCoinAmountInput: function (e) {
    this.setData({ coinAmount: e.detail.value });
  },

  onCoinReasonInput: function (e) {
    this.setData({ coinReason: e.detail.value });
  },

  saveCoinAdjustment: function () {
    var that = this;
    var member = this.data.coinMember;
    if (!member || this.data.coinSaving) return;
    var amount = Number(this.data.coinAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return wx.showToast({ title: '请输入有效的金币数量', icon: 'none' });
    }
    amount = Math.round(amount * 100) / 100;
    if (amount > 100000) {
      return wx.showToast({ title: '单次最多调整100000金币', icon: 'none' });
    }
    if (this.data.coinMode === 'deduct') {
      amount = -amount;
      if (Math.abs(amount) > Number(member.balance || 0)) {
        return wx.showToast({ title: '扣减数量不能超过当前金币', icon: 'none' });
      }
    }
    var actionText = amount > 0 ? '发放' : '扣减';
    wx.showModal({
      title: '确认' + actionText + '金币',
      content: '将为“' + member.displayName + '”' + actionText + ' ' + Math.abs(amount).toFixed(2) + ' 金币。该操作会记录管理员日志。',
      confirmText: '确认' + actionText,
      confirmColor: amount > 0 ? '#d99a20' : '#d84a3a',
      success: function (res) {
        if (!res.confirm) return;
        that.setData({ coinSaving: true });
        api.adminAdjustMemberCoins(member._id, amount, that.data.coinReason).then(function (result) {
          var balance = Number(result.balance || 0).toFixed(2);
          wx.vibrateShort({ type: 'medium' });
          wx.showToast({ title: actionText + '成功', icon: 'success' });
          that.setData({ coinSaving: false, coinEditing: false, coinMember: null });
          that.loadMembers();
          setTimeout(function () {
            wx.showToast({ title: '当前金币 ' + balance, icon: 'none' });
          }, 1200);
        }).catch(function (err) {
          that.setData({ coinSaving: false });
          wx.showModal({ title: actionText + '失败', content: err.msg || '金币调整失败', showCancel: false });
        });
      }
    });
  },

  openAdminEdit: function (e) {
    if (!this.data.canManageAdmins) return wx.showToast({ title: '仅超级管理员可分配权限', icon: 'none' });
    var index = Number(e.currentTarget.dataset.index);
    var member = this.data.members[index];
    if (!member) return;
    var role = member.admin ? member.admin.role : 'operator';
    var roleIndex = 0;
    for (var i = 0; i < this.data.adminRoles.length; i++) {
      if (this.data.adminRoles[i].value === role) roleIndex = i;
    }
    this.setData({
      adminEditing: true,
      adminMember: member,
      adminRole: role,
      adminRoleIndex: roleIndex,
      adminStatus: member.admin ? member.admin.status !== false : true
    });
  },

  closeAdminEdit: function () {
    if (this.data.adminSaving) return;
    this.setData({ adminEditing: false, adminMember: null });
  },

  selectAdminRole: function (e) {
    if (this.data.adminMember && this.data.adminMember.isCurrentUser && this.data.adminMember.admin) return;
    var role = e.currentTarget.dataset.role;
    var index = Number(e.currentTarget.dataset.index);
    this.setData({ adminRole: role, adminRoleIndex: index });
  },

  onAdminStatusSwitch: function (e) {
    this.setData({ adminStatus: e.detail.value });
  },

  saveAdminRole: function () {
    var that = this;
    var member = this.data.adminMember;
    if (!member || this.data.adminSaving) return;
    if (member.isCurrentUser && member.admin) {
      return wx.showToast({ title: '不能修改当前自己的管理员身份', icon: 'none' });
    }
    this.setData({ adminSaving: true });
    api.adminSave(member.openid, this.data.adminRole, this.data.adminStatus).then(function () {
      wx.vibrateShort({ type: 'medium' });
      wx.showToast({ title: member.admin ? '管理员已更新' : '管理员已分配', icon: 'success' });
      that.setData({ adminSaving: false, adminEditing: false, adminMember: null });
      that.loadMembers();
    }).catch(function (err) {
      that.setData({ adminSaving: false });
      wx.showModal({ title: '操作失败', content: err.msg || '管理员保存失败', showCancel: false });
    });
  },

  removeAdminRole: function () {
    var that = this;
    var member = this.data.adminMember;
    if (!member || !member.admin || this.data.adminSaving) return;
    if (member.isCurrentUser) return wx.showToast({ title: '不能撤销当前自己的管理员身份', icon: 'none' });
    wx.showModal({
      title: '撤销管理员',
      content: '撤销后“' + member.displayName + '”将无法进入商家管理后台，确定继续吗？',
      confirmText: '确认撤销',
      confirmColor: '#d84a3a',
      success: function (res) {
        if (!res.confirm) return;
        that.setData({ adminSaving: true });
        api.adminRemove(member.admin._id).then(function () {
          wx.showToast({ title: '管理员已撤销', icon: 'success' });
          that.setData({ adminSaving: false, adminEditing: false, adminMember: null });
          that.loadMembers();
        }).catch(function (err) {
          that.setData({ adminSaving: false });
          wx.showModal({ title: '撤销失败', content: err.msg || '管理员撤销失败', showCancel: false });
        });
      }
    });
  },

  openEdit: function (e) {
    var index = Number(e.currentTarget.dataset.index);
    var member = this.data.members[index];
    if (!member) return;
    this.setData({
      editing: true,
      currentMember: member,
      form: {
        level: Number(member.level || 1),
        levelText: 'LV' + Number(member.level || 1) + ' ' + (member.levelName || membership.getMembership(member.score).name),
        score: Number(member.score || 0),
        status: member.status !== false,
        remark: member.remark || ''
      }
    });
  },

  closeEdit: function () {
    if (this.data.saving) return;
    this.setData({ editing: false, currentMember: null });
  },

  stopTap: function () {},

  onLevelInput: function () {},
  onScoreInput: function (e) {
    var score = Math.max(0, Math.floor(Number(e.detail.value || 0)));
    var level = membership.getMembership(score);
    this.setData({ 'form.score': e.detail.value, 'form.level': level.level, 'form.levelText': 'LV' + level.level + ' ' + level.name });
  },
  onRemarkInput: function (e) { this.setData({ 'form.remark': e.detail.value }); },

  onStatusSwitch: function (e) {
    var nextStatus = e.detail.value;
    var that = this;
    if (!nextStatus && this.data.form.status) {
      wx.showModal({
        title: '停用用户',
        content: '停用后该用户仍可查看历史订单，但无法提交新订单。确认停用吗？',
        confirmColor: '#d84a3a',
        success: function (res) {
          that.setData({ 'form.status': !!res.confirm });
        }
      });
    } else {
      this.setData({ 'form.status': nextStatus });
    }
  },

  saveMember: function () {
    var that = this;
    var member = this.data.currentMember;
    if (!member || this.data.saving) return;
    var form = this.data.form;
    var payload = {
      level: Math.floor(Number(form.level || 1)),
      score: Math.floor(Number(form.score || 0)),
      status: form.status !== false,
      remark: form.remark || '',
      // 兼容已部署的旧版云函数：编辑资料时把当前余额原样带回，避免缺失 balance 被判为 invalid。
      // 金币实际变更仍只通过独立的金币调整接口完成。
      balance: Math.round(Number(member.balance || 0) * 100) / 100
    };
    if (payload.level < 1 || payload.level > 99) {
      wx.showToast({ title: '等级需为1-99', icon: 'none' });
      return;
    }
    if (payload.score < 0) {
      wx.showToast({ title: '积分不能为负', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    api.adminUpdateMember(member._id, payload).then(function () {
      if (wx.vibrateShort) wx.vibrateShort({ type: 'medium' });
      wx.showToast({ title: '用户已保存', icon: 'success' });
      that.setData({ saving: false, editing: false, currentMember: null });
      that.loadMembers();
    }).catch(function (err) {
      wx.showModal({ title: '保存失败', content: err.msg || '用户保存失败', showCancel: false });
      that.setData({ saving: false });
    });
  }
});
