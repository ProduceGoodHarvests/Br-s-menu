var api = require('../../utils/cloud-api');

function emptyDish(cid) { return { name: '', cid: cid || '', price: '', stock: 100, img: '', sales: 0, status: true, desc: '', sort: 100, specText: '' }; }

function specToText(spec) {
  return (spec || []).map(function (group) { return group.name + ':' + (group.options || []).map(function (option) { return option.name + (Number(option.priceDelta || 0) ? '+' + option.priceDelta : ''); }).join(','); }).join(';');
}

function parseSpec(text) {
  if (!String(text || '').trim()) return [];
  return String(text).split(';').map(function (groupText) {
    var parts = groupText.split(':');
    if (parts.length < 2) throw new Error('规格格式错误，请使用“规格名:选项,选项+加价”');
    return { name: parts[0].trim(), options: parts.slice(1).join(':').split(',').map(function (optionText) {
      var match = optionText.trim().match(/^(.*?)(?:\+([0-9]+(?:\.[0-9]+)?))?$/);
      return { name: match[1].trim(), priceDelta: Number(match[2] || 0) };
    }).filter(function (option) { return option.name; }) };
  }).filter(function (group) { return group.name && group.options.length; });
}

Page({
  data: { dishes: [], categories: [], formVisible: false, editingId: '', form: emptyDish(''), categoryIndex: 0, saving: false },
  onShow: function () { this.loadData(); },

  loadData: function () {
    var that = this;
    Promise.all([api.adminDishes(), api.adminCategories()]).then(function (results) {
      that.setData({ dishes: results[0].dishes || [], categories: results[1].categories || [] });
    }).catch(function (err) { wx.showToast({ title: err.msg || '数据加载失败', icon: 'none' }); });
  },

  addDish: function () {
    var cid = this.data.categories[0] ? this.data.categories[0]._id : '';
    this.setData({ formVisible: true, editingId: '', form: emptyDish(cid), categoryIndex: 0 });
  },

  editDish: function (e) {
    var dish = this.data.dishes[Number(e.currentTarget.dataset.index)];
    if (!dish) return;
    var categoryIndex = 0;
    for (var i = 0; i < this.data.categories.length; i++) if (this.data.categories[i]._id === dish.cid) categoryIndex = i;
    this.setData({ formVisible: true, editingId: dish._id, categoryIndex: categoryIndex, form: Object.assign({}, dish, { specText: specToText(dish.spec) }) });
  },

  closeForm: function () { this.setData({ formVisible: false }); },
  onField: function (e) { var form = this.data.form; form[e.currentTarget.dataset.field] = e.detail.value; this.setData({ form: form }); },
  onStatus: function (e) { var form = this.data.form; form.status = e.detail.value; this.setData({ form: form }); },
  onCategory: function (e) { var index = Number(e.detail.value); var form = this.data.form; form.cid = this.data.categories[index]._id; this.setData({ categoryIndex: index, form: form }); },

  chooseImage: function () {
    var that = this;
    wx.chooseMedia({ count: 1, mediaType: ['image'], sizeType: ['compressed'], success: function (result) {
      var file = result.tempFiles[0];
      if (Number(file.size || 0) > 650 * 1024 && wx.compressImage) {
        wx.compressImage({ src: file.tempFilePath, quality: 50, success: function (compressed) { that.uploadImageFile(compressed.tempFilePath); }, fail: function () { that.uploadImageFile(file.tempFilePath); } });
      } else {
        that.uploadImageFile(file.tempFilePath);
      }
    } });
  },

  uploadImageFile: function (filePath) {
    var that = this;
    wx.showLoading({ title: '上传中' });
    wx.getFileSystemManager().readFile({ filePath: filePath, encoding: 'base64', success: function (read) {
      var extension = (filePath.split('.').pop() || 'jpg').toLowerCase();
      api.uploadImage(read.data, extension, 'dish').then(function (uploaded) { var form = that.data.form; form.img = uploaded.fileID; that.setData({ form: form }); wx.showToast({ title: '上传成功', icon: 'success' }); }).catch(function (err) { wx.showModal({ title: '上传失败', content: err.msg || '图片上传失败', showCancel: false }); }).finally(function () { wx.hideLoading(); });
    }, fail: function () { wx.hideLoading(); wx.showToast({ title: '读取图片失败', icon: 'none' }); } });
  },

  saveDish: function () {
    var that = this;
    var form = Object.assign({}, this.data.form);
    try { form.spec = parseSpec(form.specText); } catch (err) { return wx.showToast({ title: err.message, icon: 'none' }); }
    delete form.specText;
    this.setData({ saving: true });
    api.adminSaveDish(this.data.editingId, form).then(function () { wx.showToast({ title: '已保存', icon: 'success' }); that.setData({ formVisible: false }); that.loadData(); }).catch(function (err) { wx.showModal({ title: '保存失败', content: err.msg || '请检查输入', showCancel: false }); }).finally(function () { that.setData({ saving: false }); });
  },

  deleteDish: function (e) {
    var that = this;
    wx.showModal({ title: '删除菜品', content: '删除后不可恢复，确定继续吗？', success: function (res) { if (!res.confirm) return; api.adminDeleteDish(e.currentTarget.dataset.id).then(function () { wx.showToast({ title: '已删除', icon: 'success' }); that.loadData(); }).catch(function (err) { wx.showToast({ title: err.msg || '删除失败', icon: 'none' }); }); } });
  },
});
