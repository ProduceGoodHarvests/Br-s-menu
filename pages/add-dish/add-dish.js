var api = require('../../utils/cloud-api');

var STATUS_FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'enabled', label: '已上架' },
  { value: 'disabled', label: '已下架' },
  { value: 'low', label: '库存预警' }
];

function emptyDish(cid, sort) {
  return {
    name: '', cid: cid || '', price: '', stock: 100, img: '', sales: 0,
    status: true, desc: '', sort: sort || 100, specText: ''
  };
}

function specToText(spec) {
  return (spec || []).map(function (group) {
    return group.name + ':' + (group.options || []).map(function (option) {
      return option.name + (Number(option.priceDelta || 0) ? '+' + option.priceDelta : '');
    }).join(',');
  }).join(';');
}

function parseSpec(text) {
  if (!String(text || '').trim()) return [];
  return String(text).split(';').map(function (groupText) {
    var parts = groupText.split(':');
    if (parts.length < 2) throw new Error('规格格式错误，请使用“规格名:选项,选项+加价”');
    return {
      name: parts[0].trim(),
      options: parts.slice(1).join(':').split(',').map(function (optionText) {
        var match = optionText.trim().match(/^(.*?)(?:\+([0-9]+(?:\.[0-9]+)?))?$/);
        return { name: match[1].trim(), priceDelta: Number(match[2] || 0) };
      }).filter(function (option) { return option.name; })
    };
  }).filter(function (group) { return group.name && group.options.length; });
}

function dishPayload(dish) {
  return {
    name: dish.name,
    cid: dish.cid,
    price: Number(dish.price),
    spec: dish.spec || [],
    stock: Number(dish.stock || 0),
    img: dish.img || '',
    sales: Number(dish.sales || 0),
    status: dish.status !== false,
    desc: dish.desc || '',
    sort: Number(dish.sort || 100)
  };
}

function normalizeDish(item, categoryMap) {
  var stock = Math.max(0, Number(item.stock || 0));
  var status = item.status !== false;
  return Object.assign({}, item, {
    img: item.img || '',
    desc: item.desc || '',
    spec: item.spec || [],
    sort: Number(item.sort || 100),
    stock: stock,
    status: status,
    statusText: status ? '已上架' : '已下架',
    statusClass: status ? 'enabled' : 'disabled',
    stockText: stock <= 0 ? '已售罄' : (stock <= 10 ? '库存偏低' : '库存充足'),
    stockClass: stock <= 0 ? 'soldout' : (stock <= 10 ? 'low' : 'normal'),
    categoryName: categoryMap[item.cid] || '未分类',
    priceText: Number(item.price || 0).toFixed(2),
    specSummary: item.spec && item.spec.length ? item.spec.length + ' 组规格' : '单规格'
  });
}

Page({
  data: {
    loading: true,
    dishes: [],
    displayDishes: [],
    categories: [],
    stats: { total: 0, enabled: 0, disabled: 0, low: 0 },
    keyword: '',
    statusFilter: 'all',
    categoryFilter: 'all',
    statusFilters: STATUS_FILTERS,
    formVisible: false,
    editingId: '',
    form: emptyDish('', 100),
    categoryIndex: 0,
    saving: false,
    uploading: false,
    actionDishId: '',
    stockEditing: false,
    stockDish: null,
    stockValue: 0,
    stockSaving: false
  },

  onShow: function () {
    this.loadData();
  },

  onPullDownRefresh: function () {
    this.loadData(true);
  },

  loadData: function (fromPullDown) {
    var that = this;
    this.setData({ loading: true });
    return Promise.all([api.adminDishes(), api.adminCategories()]).then(function (results) {
      var categories = results[1].categories || [];
      var categoryMap = {};
      categories.forEach(function (item) { categoryMap[item._id] = item.name; });
      var dishes = (results[0].dishes || []).map(function (item) { return normalizeDish(item, categoryMap); });
      var stats = { total: dishes.length, enabled: 0, disabled: 0, low: 0 };
      dishes.forEach(function (item) {
        stats[item.status ? 'enabled' : 'disabled'] += 1;
        if (item.stock <= 10) stats.low += 1;
      });
      that.setData({ dishes: dishes, categories: categories, stats: stats, loading: false }, function () {
        that.applyFilters();
      });
    }).catch(function (err) {
      that.setData({ loading: false });
      wx.showToast({ title: err.msg || '数据加载失败', icon: 'none' });
    }).then(function () {
      if (fromPullDown) wx.stopPullDownRefresh();
    });
  },

  onSearchInput: function (e) {
    var that = this;
    this.setData({ keyword: e.detail.value }, function () { that.applyFilters(); });
  },

  clearSearch: function () {
    var that = this;
    this.setData({ keyword: '' }, function () { that.applyFilters(); });
  },

  selectStatus: function (e) {
    var that = this;
    this.setData({ statusFilter: e.currentTarget.dataset.value }, function () { that.applyFilters(); });
  },

  selectCategoryFilter: function (e) {
    var that = this;
    this.setData({ categoryFilter: e.currentTarget.dataset.value }, function () { that.applyFilters(); });
  },

  resetFilters: function () {
    var that = this;
    this.setData({ keyword: '', statusFilter: 'all', categoryFilter: 'all' }, function () { that.applyFilters(); });
  },

  applyFilters: function () {
    var keyword = String(this.data.keyword || '').trim().toUpperCase();
    var status = this.data.statusFilter;
    var category = this.data.categoryFilter;
    var displayDishes = this.data.dishes.filter(function (item) {
      var matchesKeyword = !keyword || item.name.toUpperCase().indexOf(keyword) >= 0 || item.categoryName.toUpperCase().indexOf(keyword) >= 0;
      var matchesCategory = category === 'all' || item.cid === category;
      var matchesStatus = status === 'all' ||
        (status === 'enabled' && item.status) ||
        (status === 'disabled' && !item.status) ||
        (status === 'low' && item.stock <= 10);
      return matchesKeyword && matchesCategory && matchesStatus;
    });
    this.setData({ displayDishes: displayDishes });
  },

  findDish: function (dishId) {
    return this.data.dishes.filter(function (item) { return item._id === dishId; })[0];
  },

  addDish: function () {
    if (!this.data.categories.length) {
      return wx.showModal({ title: '请先创建分类', content: '新增菜品前需要至少创建一个菜品分类。', showCancel: false });
    }
    var nextSort = this.data.dishes.length ? Number(this.data.dishes[this.data.dishes.length - 1].sort || 0) + 10 : 10;
    this.setData({
      formVisible: true,
      editingId: '',
      form: emptyDish(this.data.categories[0]._id, nextSort),
      categoryIndex: 0
    });
  },

  editDish: function (e) {
    var dish = this.findDish(e.currentTarget.dataset.id);
    if (!dish) return;
    var categoryIndex = 0;
    for (var i = 0; i < this.data.categories.length; i++) {
      if (this.data.categories[i]._id === dish.cid) categoryIndex = i;
    }
    this.setData({
      formVisible: true,
      editingId: dish._id,
      categoryIndex: categoryIndex,
      form: Object.assign({}, dish, { specText: specToText(dish.spec) })
    });
  },

  closeForm: function () {
    if (this.data.saving || this.data.uploading) return;
    this.setData({ formVisible: false });
  },

  stopTap: function () {},

  onField: function (e) {
    var path = 'form.' + e.currentTarget.dataset.field;
    var data = {};
    data[path] = e.detail.value;
    this.setData(data);
  },

  onStatus: function (e) {
    this.setData({ 'form.status': e.detail.value });
  },

  onCategory: function (e) {
    var index = Number(e.detail.value);
    this.setData({ categoryIndex: index, 'form.cid': this.data.categories[index]._id });
  },

  chooseImage: function () {
    var that = this;
    if (this.data.uploading) return;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: function (result) {
        var file = result.tempFiles[0];
        if (!file) return;
        if (Number(file.size || 0) > 650 * 1024 && wx.compressImage) {
          wx.compressImage({
            src: file.tempFilePath,
            quality: 50,
            success: function (compressed) { that.uploadImageFile(compressed.tempFilePath); },
            fail: function () { that.uploadImageFile(file.tempFilePath); }
          });
        } else {
          that.uploadImageFile(file.tempFilePath);
        }
      }
    });
  },

  uploadImageFile: function (filePath) {
    var that = this;
    this.setData({ uploading: true });
    wx.getFileSystemManager().readFile({
      filePath: filePath,
      encoding: 'base64',
      success: function (read) {
        var cleanPath = String(filePath || '').split('?')[0];
        var extension = (cleanPath.split('.').pop() || 'jpg').toLowerCase();
        if (['jpg', 'jpeg', 'png', 'webp'].indexOf(extension) < 0) extension = 'jpg';
        api.uploadImage(read.data, extension, 'dish').then(function (uploaded) {
          that.setData({ 'form.img': uploaded.fileID, uploading: false });
          wx.showToast({ title: '图片上传成功', icon: 'success' });
        }).catch(function (err) {
          that.setData({ uploading: false });
          wx.showModal({ title: '上传失败', content: err.msg || '图片上传失败', showCancel: false });
        });
      },
      fail: function () {
        that.setData({ uploading: false });
        wx.showToast({ title: '读取图片失败', icon: 'none' });
      }
    });
  },

  saveDish: function () {
    var that = this;
    if (this.data.saving || this.data.uploading) return;
    var form = Object.assign({}, this.data.form);
    form.name = String(form.name || '').trim();
    form.price = Number(form.price);
    form.stock = Math.floor(Number(form.stock));
    form.sort = Math.floor(Number(form.sort));
    if (!form.name) return wx.showToast({ title: '请输入菜品名称', icon: 'none' });
    if (!form.cid) return wx.showToast({ title: '请选择菜品分类', icon: 'none' });
    if (!Number.isFinite(form.price) || form.price <= 0) return wx.showToast({ title: '请输入有效售价', icon: 'none' });
    if (!Number.isFinite(form.stock) || form.stock < 0) return wx.showToast({ title: '库存不能小于0', icon: 'none' });
    if (!Number.isFinite(form.sort)) form.sort = 100;
    try {
      form.spec = parseSpec(form.specText);
    } catch (err) {
      return wx.showToast({ title: err.message, icon: 'none' });
    }
    delete form.specText;
    this.setData({ saving: true });
    api.adminSaveDish(this.data.editingId, form).then(function () {
      wx.vibrateShort({ type: 'light' });
      wx.showToast({ title: that.data.editingId ? '菜品已更新' : '菜品已新增', icon: 'success' });
      that.setData({ formVisible: false, saving: false });
      that.loadData();
    }).catch(function (err) {
      that.setData({ saving: false });
      wx.showModal({ title: '保存失败', content: err.msg || '请检查输入', showCancel: false });
    });
  },

  toggleDishStatus: function (e) {
    var that = this;
    var dish = this.findDish(e.currentTarget.dataset.id);
    if (!dish || this.data.actionDishId) return;
    var nextStatus = !dish.status;
    var execute = function () {
      that.setData({ actionDishId: dish._id });
      var payload = dishPayload(dish);
      payload.status = nextStatus;
      api.adminSaveDish(dish._id, payload).then(function () {
        wx.showToast({ title: nextStatus ? '菜品已上架' : '菜品已下架', icon: 'success' });
        that.loadData();
      }).catch(function (err) {
        wx.showToast({ title: err.msg || '操作失败', icon: 'none' });
      }).then(function () {
        that.setData({ actionDishId: '' });
      });
    };
    if (!nextStatus) {
      wx.showModal({
        title: '下架“' + dish.name + '”',
        content: '下架后顾客将无法看到和购买该菜品，库存及历史销量不会删除。',
        confirmText: '确认下架',
        confirmColor: '#d84a3a',
        success: function (res) { if (res.confirm) execute(); }
      });
    } else {
      execute();
    }
  },

  openStockEdit: function (e) {
    var dish = this.findDish(e.currentTarget.dataset.id);
    if (!dish) return;
    this.setData({ stockEditing: true, stockDish: dish, stockValue: dish.stock });
  },

  closeStockEdit: function () {
    if (this.data.stockSaving) return;
    this.setData({ stockEditing: false, stockDish: null });
  },

  onStockInput: function (e) {
    this.setData({ stockValue: e.detail.value });
  },

  adjustStock: function (e) {
    var next = Math.max(0, Number(this.data.stockValue || 0) + Number(e.currentTarget.dataset.delta || 0));
    this.setData({ stockValue: next });
  },

  saveStock: function () {
    var that = this;
    var dish = this.data.stockDish;
    var stock = Math.floor(Number(this.data.stockValue));
    if (!dish || this.data.stockSaving) return;
    if (!Number.isFinite(stock) || stock < 0) return wx.showToast({ title: '请输入有效库存', icon: 'none' });
    this.setData({ stockSaving: true });
    var payload = dishPayload(dish);
    payload.stock = stock;
    api.adminSaveDish(dish._id, payload).then(function () {
      wx.showToast({ title: '库存已更新', icon: 'success' });
      that.setData({ stockSaving: false, stockEditing: false, stockDish: null });
      that.loadData();
    }).catch(function (err) {
      that.setData({ stockSaving: false });
      wx.showModal({ title: '库存修改失败', content: err.msg || '操作失败', showCancel: false });
    });
  },

  deleteDish: function (e) {
    var that = this;
    var dish = this.findDish(e.currentTarget.dataset.id);
    if (!dish || this.data.actionDishId) return;
    wx.showModal({
      title: '删除“' + dish.name + '”',
      content: '删除后菜品资料无法恢复，历史订单中的菜品快照不会受影响。',
      confirmText: '确认删除',
      confirmColor: '#d84a3a',
      success: function (res) {
        if (!res.confirm) return;
        that.setData({ actionDishId: dish._id });
        api.adminDeleteDish(dish._id).then(function () {
          wx.showToast({ title: '菜品已删除', icon: 'success' });
          that.loadData();
        }).catch(function (err) {
          wx.showToast({ title: err.msg || '删除失败', icon: 'none' });
        }).then(function () {
          that.setData({ actionDishId: '' });
        });
      }
    });
  }
});
