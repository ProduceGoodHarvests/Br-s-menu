var api = require('../../utils/cloud-api');

function normalizeCategory(item) {
  var enabled = item.status !== false;
  return Object.assign({}, item, {
    status: enabled,
    statusText: enabled ? '展示中' : '已隐藏',
    statusClass: enabled ? 'enabled' : 'disabled',
    dishCount: Number(item.dishCount || 0),
    enabledDishCount: Number(item.enabledDishCount || 0),
  });
}

function normalizeTable(item) {
  var status = item.status || 'idle';
  var statusMap = {
    idle: { text: '空闲', className: 'idle', hint: '可正常接待顾客' },
    occupied: { text: '使用中', className: 'occupied', hint: '已有堂食订单' },
    disabled: { text: '已停用', className: 'disabled', hint: '顾客暂不可选择' },
  };
  var statusInfo = statusMap[status] || statusMap.idle;
  return Object.assign({}, item, {
    area: item.area || '大厅',
    status: status,
    statusText: statusInfo.text,
    statusClass: statusInfo.className,
    statusHint: statusInfo.hint,
  });
}

Page({
  data: {
    themeClass: getApp().getThemeClass(),
    themeAccent: getApp().getThemeAccent(),
    tab: 'category',
    categories: [],
    displayCategories: [],
    categoryStats: { total: 0, enabled: 0, disabled: 0, dishes: 0 },
    categorySearch: '',
    categoryStatusFilter: 'all',
    categoryStatusFilters: [
      { value: 'all', label: '全部' },
      { value: 'enabled', label: '展示中' },
      { value: 'disabled', label: '已隐藏' },
    ],
    categorySheetVisible: false,
    categoryEditing: false,
    categoryId: '',
    categoryName: '',
    categorySort: 100,
    categoryStatus: true,
    categorySaving: false,
    categoryActionId: '',
    tables: [],
    displayTables: [],
    tableAreas: [],
    tableStats: { total: 0, idle: 0, occupied: 0, disabled: 0 },
    tableSearch: '',
    tableStatusFilter: 'all',
    tableAreaFilter: 'all',
    tableStatusFilters: [
      { value: 'all', label: '全部' },
      { value: 'idle', label: '空闲' },
      { value: 'occupied', label: '使用中' },
      { value: 'disabled', label: '已停用' },
    ],
    loading: true,
    tableSheetVisible: false,
    tableEditing: false,
    tableNo: '',
    tableArea: '大厅',
    tableStatus: 'idle',
    tableSaving: false,
    tableActionNo: '',
  },

  onLoad: function (options) {
    if (options && options.tab === 'table') this.setData({ tab: 'table' });
  },

  onShow: function () {
    getApp().syncPageTheme(this);
    this.loadAll();
  },

  onPullDownRefresh: function () {
    this.loadAll(true);
  },

  loadAll: function (fromPullDown) {
    var that = this;
    this.setData({ loading: true });
    Promise.all([api.adminCategories(), api.adminTables()]).then(function (results) {
      var categories = (results[0].categories || []).map(normalizeCategory);
      var categoryStats = { total: categories.length, enabled: 0, disabled: 0, dishes: 0 };
      var tables = (results[1].tables || []).map(normalizeTable);
      var areas = [];
      var stats = { total: tables.length, idle: 0, occupied: 0, disabled: 0 };

      categories.forEach(function (item) {
        categoryStats[item.status ? 'enabled' : 'disabled'] += 1;
        categoryStats.dishes += item.dishCount;
      });

      tables.forEach(function (item) {
        if (areas.indexOf(item.area) < 0) areas.push(item.area);
        if (stats[item.status] !== undefined) stats[item.status] += 1;
      });

      that.setData({
        categories: categories,
        categoryStats: categoryStats,
        tables: tables,
        tableAreas: areas,
        tableStats: stats,
        loading: false,
      }, function () {
        that.applyCategoryFilters();
        that.applyTableFilters();
      });
    }).catch(function (err) {
      that.setData({ loading: false });
      wx.showToast({ title: err.msg || '加载失败', icon: 'none' });
    }).then(function () {
      if (fromPullDown) wx.stopPullDownRefresh();
    });
  },

  switchTab: function (e) {
    this.setData({ tab: e.currentTarget.dataset.tab });
  },

  onCategoryName: function (e) {
    this.setData({ categoryName: e.detail.value });
  },

  onCategorySort: function (e) {
    this.setData({ categorySort: e.detail.value });
  },

  onCategorySearch: function (e) {
    var that = this;
    this.setData({ categorySearch: e.detail.value }, function () { that.applyCategoryFilters(); });
  },

  clearCategorySearch: function () {
    var that = this;
    this.setData({ categorySearch: '' }, function () { that.applyCategoryFilters(); });
  },

  selectCategoryStatus: function (e) {
    var that = this;
    this.setData({ categoryStatusFilter: e.currentTarget.dataset.value }, function () { that.applyCategoryFilters(); });
  },

  resetCategoryFilters: function () {
    var that = this;
    this.setData({ categorySearch: '', categoryStatusFilter: 'all' }, function () { that.applyCategoryFilters(); });
  },

  applyCategoryFilters: function () {
    var keyword = String(this.data.categorySearch || '').trim().toUpperCase();
    var status = this.data.categoryStatusFilter;
    var displayCategories = this.data.categories.filter(function (item) {
      var matchesKeyword = !keyword || item.name.toUpperCase().indexOf(keyword) >= 0;
      var matchesStatus = status === 'all' || (status === 'enabled' ? item.status : !item.status);
      return matchesKeyword && matchesStatus;
    });
    this.setData({ displayCategories: displayCategories });
  },

  openCreateCategory: function () {
    var nextSort = this.data.categories.length ? Number(this.data.categories[this.data.categories.length - 1].sort || 0) + 10 : 10;
    this.setData({
      categorySheetVisible: true,
      categoryEditing: false,
      categoryId: '',
      categoryName: '',
      categorySort: nextSort,
      categoryStatus: true,
    });
  },

  editCategory: function (e) {
    var categoryId = e.currentTarget.dataset.id;
    var item = this.data.categories.filter(function (category) { return category._id === categoryId; })[0];
    if (!item) return;
    this.setData({
      categorySheetVisible: true,
      categoryEditing: true,
      categoryId: item._id,
      categoryName: item.name,
      categorySort: item.sort,
      categoryStatus: item.status,
    });
  },

  closeCategorySheet: function () {
    if (this.data.categorySaving) return;
    this.setData({ categorySheetVisible: false });
  },

  onCategoryEnabledChange: function (e) {
    this.setData({ categoryStatus: e.detail.value });
  },

  saveCategory: function () {
    var that = this;
    var name = String(this.data.categoryName || '').trim();
    var sort = Number(this.data.categorySort);
    if (!name) return wx.showToast({ title: '请输入分类名称', icon: 'none' });
    if (!isFinite(sort)) return wx.showToast({ title: '请输入有效排序值', icon: 'none' });
    if (this.data.categorySaving) return;

    this.setData({ categorySaving: true });
    api.adminSaveCategory(this.data.categoryId, {
      name: name,
      sort: sort,
      status: this.data.categoryStatus,
    }).then(function () {
      that.setData({ categorySaving: false, categorySheetVisible: false });
      that.loadAll();
      wx.vibrateShort({ type: 'light' });
      wx.showToast({ title: that.data.categoryEditing ? '分类已更新' : '分类已新增', icon: 'success' });
    }).catch(function (err) {
      that.setData({ categorySaving: false });
      wx.showToast({ title: err.msg || '保存失败', icon: 'none' });
    });
  },

  toggleCategory: function (e) {
    var that = this;
    var categoryId = e.currentTarget.dataset.id;
    var item = this.data.categories.filter(function (category) { return category._id === categoryId; })[0];
    if (!item || this.data.categoryActionId) return;
    var nextStatus = !item.status;
    var execute = function () {
      that.setData({ categoryActionId: categoryId });
      api.adminSaveCategory(item._id, { name: item.name, sort: item.sort, status: nextStatus }).then(function () {
        wx.showToast({ title: nextStatus ? '分类已展示' : '分类已隐藏', icon: 'success' });
        that.loadAll();
      }).catch(function (err) {
        wx.showToast({ title: err.msg || '操作失败', icon: 'none' });
      }).then(function () {
        that.setData({ categoryActionId: '' });
      });
    };

    if (!nextStatus) {
      wx.showModal({
        title: '隐藏“' + item.name + '”',
        content: '隐藏后该分类及分类下菜品将不在顾客菜单中展示，数据不会被删除。',
        confirmText: '确认隐藏',
        confirmColor: '#d84a3a',
        success: function (res) { if (res.confirm) execute(); },
      });
    } else {
      execute();
    }
  },

  deleteCategory: function (e) {
    var that = this;
    var categoryId = e.currentTarget.dataset.id;
    var item = this.data.categories.filter(function (category) { return category._id === categoryId; })[0];
    if (this.data.categoryActionId) return;
    if (item && item.dishCount > 0) return wx.showToast({ title: '分类下有菜品，不能删除', icon: 'none' });
    wx.showModal({
      title: '删除分类',
      content: '确定删除“' + (item ? item.name : '该分类') + '”吗？删除后无法恢复。',
      confirmText: '确认删除',
      confirmColor: '#d84a3a',
      success: function (res) {
        if (!res.confirm) return;
        that.setData({ categoryActionId: categoryId });
        api.adminDeleteCategory(categoryId).then(function () {
          wx.showToast({ title: '分类已删除', icon: 'success' });
          that.loadAll();
        }).catch(function (err) {
          wx.showToast({ title: err.msg || '删除失败', icon: 'none' });
        }).then(function () {
          that.setData({ categoryActionId: '' });
        });
      },
    });
  },

  onTableSearch: function (e) {
    var that = this;
    this.setData({ tableSearch: e.detail.value }, function () { that.applyTableFilters(); });
  },

  clearTableSearch: function () {
    var that = this;
    this.setData({ tableSearch: '' }, function () { that.applyTableFilters(); });
  },

  selectTableStatus: function (e) {
    var that = this;
    this.setData({ tableStatusFilter: e.currentTarget.dataset.value }, function () { that.applyTableFilters(); });
  },

  selectTableArea: function (e) {
    var that = this;
    this.setData({ tableAreaFilter: e.currentTarget.dataset.value }, function () { that.applyTableFilters(); });
  },

  resetTableFilters: function () {
    var that = this;
    this.setData({ tableSearch: '', tableStatusFilter: 'all', tableAreaFilter: 'all' }, function () { that.applyTableFilters(); });
  },

  applyTableFilters: function () {
    var keyword = String(this.data.tableSearch || '').trim().toUpperCase();
    var status = this.data.tableStatusFilter;
    var area = this.data.tableAreaFilter;
    var displayTables = this.data.tables.filter(function (item) {
      var matchesKeyword = !keyword || item.tableNo.toUpperCase().indexOf(keyword) >= 0 || item.area.toUpperCase().indexOf(keyword) >= 0;
      var matchesStatus = status === 'all' || item.status === status;
      var matchesArea = area === 'all' || item.area === area;
      return matchesKeyword && matchesStatus && matchesArea;
    });
    this.setData({ displayTables: displayTables });
  },

  openCreateTable: function () {
    this.setData({
      tableSheetVisible: true,
      tableEditing: false,
      tableNo: '',
      tableArea: this.data.tableAreaFilter === 'all' ? '大厅' : this.data.tableAreaFilter,
      tableStatus: 'idle',
    });
  },

  editTable: function (e) {
    var tableNo = e.currentTarget.dataset.no;
    var item = this.data.tables.filter(function (table) { return table.tableNo === tableNo; })[0];
    if (!item) return;
    this.setData({
      tableSheetVisible: true,
      tableEditing: true,
      tableNo: item.tableNo,
      tableArea: item.area,
      tableStatus: item.status,
    });
  },

  closeTableSheet: function () {
    if (this.data.tableSaving) return;
    this.setData({ tableSheetVisible: false });
  },

  preventBubble: function () {},

  onTableNo: function (e) {
    this.setData({ tableNo: e.detail.value.toUpperCase().replace(/\s/g, '') });
  },

  onTableArea: function (e) {
    this.setData({ tableArea: e.detail.value });
  },

  selectFormArea: function (e) {
    this.setData({ tableArea: e.currentTarget.dataset.value });
  },

  onTableEnabledChange: function (e) {
    this.setData({ tableStatus: e.detail.value ? 'idle' : 'disabled' });
  },

  saveTable: function () {
    var that = this;
    var tableNo = String(this.data.tableNo || '').trim().toUpperCase();
    var area = String(this.data.tableArea || '').trim();
    if (!tableNo) return wx.showToast({ title: '请输入桌号', icon: 'none' });
    if (!/^[A-Z0-9_-]+$/.test(tableNo)) return wx.showToast({ title: '桌号仅支持字母、数字、_ 和 -', icon: 'none' });
    if (!area) return wx.showToast({ title: '请输入桌台区域', icon: 'none' });
    if (this.data.tableSaving) return;

    this.setData({ tableSaving: true });
    api.adminSaveTable({
      tableNo: tableNo,
      area: area,
      status: this.data.tableStatus,
    }).then(function () {
      that.setData({ tableSaving: false, tableSheetVisible: false });
      wx.vibrateShort({ type: 'light' });
      wx.showToast({ title: that.data.tableEditing ? '桌台已更新' : '桌台已新增', icon: 'success' });
      that.loadAll();
    }).catch(function (err) {
      that.setData({ tableSaving: false });
      wx.showToast({ title: err.msg || '保存失败', icon: 'none' });
    });
  },

  toggleTable: function (e) {
    var that = this;
    var tableNo = e.currentTarget.dataset.no;
    var item = this.data.tables.filter(function (table) { return table.tableNo === tableNo; })[0];
    if (!item || this.data.tableActionNo) return;
    if (item.status === 'occupied') return wx.showToast({ title: '使用中的桌台不能停用', icon: 'none' });

    var nextStatus = item.status === 'disabled' ? 'idle' : 'disabled';
    var execute = function () {
      that.setData({ tableActionNo: tableNo });
      api.adminSaveTable({ tableNo: item.tableNo, area: item.area, status: nextStatus }).then(function () {
        wx.showToast({ title: nextStatus === 'idle' ? '桌台已启用' : '桌台已停用', icon: 'success' });
        return that.loadAll();
      }).catch(function (err) {
        wx.showToast({ title: err.msg || '操作失败', icon: 'none' });
      }).then(function () {
        that.setData({ tableActionNo: '' });
      });
    };

    if (nextStatus === 'disabled') {
      wx.showModal({
        title: '停用 ' + item.tableNo + ' 桌',
        content: '停用后顾客将无法选择该桌台，之后可随时重新启用。',
        confirmText: '确认停用',
        confirmColor: '#d84a3a',
        success: function (res) { if (res.confirm) execute(); },
      });
    } else {
      execute();
    }
  },

  deleteTable: function (e) {
    var that = this;
    var tableNo = e.currentTarget.dataset.no;
    var item = this.data.tables.filter(function (table) { return table.tableNo === tableNo; })[0];
    if (this.data.tableActionNo) return;
    if (item && item.status === 'occupied') return wx.showToast({ title: '使用中的桌台不能删除', icon: 'none' });
    wx.showModal({
      title: '删除 ' + tableNo + ' 桌',
      content: '删除后将从桌台列表中永久移除，历史订单不会受影响。',
      confirmText: '确认删除',
      confirmColor: '#d84a3a',
      success: function (res) {
        if (!res.confirm) return;
        that.setData({ tableActionNo: tableNo });
        api.adminDeleteTable(tableNo).then(function () {
          wx.showToast({ title: '桌台已删除', icon: 'success' });
          return that.loadAll();
        }).catch(function (err) {
          wx.showToast({ title: err.msg || '删除失败', icon: 'none' });
        }).then(function () {
          that.setData({ tableActionNo: '' });
        });
      },
    });
  },
});
