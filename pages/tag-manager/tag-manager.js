var api = require('../../utils/cloud-api');

Page({
  data: { themeClass: getApp().getThemeClass(), tab: 'print', admins: [], jobs: [], openid: '', role: 'operator', roles: [{ value: 'operator', label: '运营管理员' }, { value: 'kitchen', label: '后厨管理员' }, { value: 'super_admin', label: '超级管理员' }] },
  onShow: function () { getApp().syncPageTheme(this); this.load(); },
  load: function () { var that = this; api.getPrintJobs().then(function (result) { that.setData({ jobs: result.jobs || [] }); }).catch(function (err) { wx.showToast({ title: err.msg || '打印任务加载失败', icon: 'none' }); }); api.adminList().then(function (result) { that.setData({ admins: result.admins || [] }); }).catch(function () {}); },
  switchTab: function (e) { this.setData({ tab: e.currentTarget.dataset.tab }); },
  onOpenid: function (e) { this.setData({ openid: e.detail.value }); },
  onRole: function (e) { this.setData({ role: this.data.roles[Number(e.detail.value)].value }); },
  addAdmin: function () { var that = this; api.adminSave(this.data.openid, this.data.role, true).then(function () { that.setData({ openid: '' }); that.load(); wx.showToast({ title: '已保存', icon: 'success' }); }).catch(function (err) { wx.showToast({ title: err.msg || '保存失败', icon: 'none' }); }); },
  removeAdmin: function (e) { var that = this; wx.showModal({ title: '删除管理员', content: '确定删除该管理员吗？', success: function (res) { if (res.confirm) api.adminRemove(e.currentTarget.dataset.id).then(function () { that.load(); }).catch(function (err) { wx.showToast({ title: err.msg || '删除失败', icon: 'none' }); }); } }); },
  reprint: function (e) { api.reprint(e.currentTarget.dataset.order).then(function () { wx.showToast({ title: '已提交', icon: 'success' }); }).catch(function (err) { wx.showToast({ title: err.msg || '补打失败', icon: 'none' }); }); },
});
