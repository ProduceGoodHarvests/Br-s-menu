var api = require('../../utils/cloud-api');

Page({
  data: { tab: 'category', categories: [], tables: [], categoryId: '', categoryName: '', categorySort: 100, tableNo: '', tableArea: '大厅', tableStatus: 'idle' },
  onShow: function () { this.loadAll(); },
  loadAll: function () { var that = this; Promise.all([api.adminCategories(), api.adminTables()]).then(function (results) { that.setData({ categories: results[0].categories || [], tables: results[1].tables || [] }); }).catch(function (err) { wx.showToast({ title: err.msg || '加载失败', icon: 'none' }); }); },
  switchTab: function (e) { this.setData({ tab: e.currentTarget.dataset.tab }); },
  onCategoryName: function (e) { this.setData({ categoryName: e.detail.value }); },
  onCategorySort: function (e) { this.setData({ categorySort: e.detail.value }); },
  editCategory: function (e) { var item = this.data.categories[Number(e.currentTarget.dataset.index)]; if (item) this.setData({ categoryId: item._id, categoryName: item.name, categorySort: item.sort }); },
  saveCategory: function () { var that = this; api.adminSaveCategory(this.data.categoryId, { name: this.data.categoryName, sort: Number(this.data.categorySort), status: true }).then(function () { that.setData({ categoryId: '', categoryName: '', categorySort: 100 }); that.loadAll(); wx.showToast({ title: '已保存', icon: 'success' }); }).catch(function (err) { wx.showToast({ title: err.msg || '保存失败', icon: 'none' }); }); },
  deleteCategory: function (e) { var that = this; wx.showModal({ title: '删除分类', content: '分类下不能有菜品，确定删除吗？', success: function (res) { if (res.confirm) api.adminDeleteCategory(e.currentTarget.dataset.id).then(function () { that.loadAll(); }).catch(function (err) { wx.showToast({ title: err.msg || '删除失败', icon: 'none' }); }); } }); },
  onTableNo: function (e) { this.setData({ tableNo: e.detail.value.toUpperCase() }); },
  onTableArea: function (e) { this.setData({ tableArea: e.detail.value }); },
  saveTable: function () { var that = this; api.adminSaveTable({ tableNo: this.data.tableNo, area: this.data.tableArea, status: 'idle' }).then(function () { that.setData({ tableNo: '' }); that.loadAll(); wx.showToast({ title: '已保存', icon: 'success' }); }).catch(function (err) { wx.showToast({ title: err.msg || '保存失败', icon: 'none' }); }); },
  disableTable: function (e) { var that = this; api.adminSaveTable({ tableNo: e.currentTarget.dataset.no, area: e.currentTarget.dataset.area, status: 'disabled' }).then(function () { that.loadAll(); }).catch(function (err) { wx.showToast({ title: err.msg || '操作失败', icon: 'none' }); }); },
  deleteTable: function (e) { var that = this; wx.showModal({ title: '删除桌台', content: '确定删除 ' + e.currentTarget.dataset.no + ' 吗？', success: function (res) { if (res.confirm) api.adminDeleteTable(e.currentTarget.dataset.no).then(function () { that.loadAll(); }).catch(function (err) { wx.showToast({ title: err.msg || '删除失败', icon: 'none' }); }); } }); },
});
