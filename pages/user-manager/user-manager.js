var api = require('../../utils/cloud-api');
var format = require('../../utils/format');

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
  item.displayName = item.nickname || item.openidShort;
  item.adminRoleText = item.admin ? (ROLE_LABELS[item.admin.role] || item.admin.role) : '';
  item.adminStatusText = item.admin && item.admin.status === false ? '已停用' : '';
  return item;
}

Page({
  data: {
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
    adminRoles: ADMIN_ROLES,
    adminEditing: false,
    adminSaving: false,
    adminMember: null,
    adminRole: 'operator',
    adminRoleIndex: 0,
    adminStatus: true,
    editing: false,
    currentMember: null,
    form: {
      level: 1,
      score: 0,
      balance: 0,
      status: true,
      remark: ''
    }
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
        score: Number(member.score || 0),
        balance: Number(member.balance || 0),
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

  onLevelInput: function (e) { this.setData({ 'form.level': e.detail.value }); },
  onScoreInput: function (e) { this.setData({ 'form.score': e.detail.value }); },
  onBalanceInput: function (e) { this.setData({ 'form.balance': e.detail.value }); },
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
      balance: Number(form.balance || 0),
      status: form.status !== false,
      remark: form.remark || ''
    };
    if (payload.level < 1 || payload.level > 99) {
      wx.showToast({ title: '等级需为1-99', icon: 'none' });
      return;
    }
    if (payload.score < 0 || payload.balance < 0 || !Number.isFinite(payload.balance)) {
      wx.showToast({ title: '积分和余额不能为负', icon: 'none' });
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
