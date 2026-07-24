var initialized = false;

function init() {
  if (initialized) return true;
  if (!wx.cloud) return false;
  wx.cloud.init({ traceUser: true });
  initialized = true;
  return true;
}

function call(action, data) {
  if (!init()) return Promise.reject({ code: 'CLOUD_UNAVAILABLE', msg: '当前基础库不支持云开发' });
  return wx.cloud.callFunction({
    name: 'restaurantService',
    data: Object.assign({}, data || {}, { action: action }),
  }).then(function (response) {
    var result = response.result || {};
    if (result.ok === false) return Promise.reject(result);
    return result;
  }).catch(function (err) {
    if (err && err.msg) return Promise.reject(err);
    var rawMessage = (err && (err.errMsg || err.message)) || '网络请求失败';
    if (/DATABASE_COLLECTION_NOT_EXIST|database collection does not exist|Db or Table not exist|-502005/i.test(rawMessage)) {
      return Promise.reject({ code: 'SYSTEM_NOT_INITIALIZED', msg: '门店云数据库尚未初始化，请管理员先完成初始化' });
    }
    return Promise.reject({ code: 'NETWORK_ERROR', msg: rawMessage });
  });
}

function getCurrentUser() { return call('auth.current'); }
function updateMemberProfile(profile) { return call('member.profile.update', profile || {}); }
function getAppConfig() { return call('app.config'); }
function getMenu() { return call('menu.list'); }
function getDish(goodsId) { return call('menu.detail', { goodsId: goodsId }); }
function getTables() { return call('table.list'); }
function quoteOrder(goodsList) { return call('order.quote', { goodsList: goodsList }); }
function createOrder(data) { return call('order.create', data); }
function getOrders(data) { return call('order.list', data || {}); }
function getOrder(orderId) { return call('order.detail', { orderId: orderId }); }
function cancelOrder(orderId) { return call('order.cancel', { orderId: orderId }); }
function getPayParams(orderId) { return call('order.pay', { orderId: orderId }); }

function adminDashboard() { return call('admin.dashboard'); }
function adminOrders(data) { return call('admin.order.list', data || {}); }
function adminUpdateOrder(orderId, orderStatus) { return call('admin.order.update', { orderId: orderId, orderStatus: orderStatus }); }
function adminDishes() { return call('admin.dish.list'); }
function adminSaveDish(dishId, dish) { return call('admin.dish.save', { dishId: dishId || '', dish: dish }); }
function adminDeleteDish(dishId) { return call('admin.dish.delete', { dishId: dishId }); }
function adminCategories() { return call('admin.category.list'); }
function adminSaveCategory(categoryId, category) { return call('admin.category.save', { categoryId: categoryId || '', category: category }); }
function adminDeleteCategory(categoryId) { return call('admin.category.delete', { categoryId: categoryId }); }
function adminTables() { return call('admin.table.list'); }
function adminSaveTable(table) { return call('admin.table.save', { table: table }); }
function adminDeleteTable(tableNo) { return call('admin.table.delete', { tableNo: tableNo }); }
function adminMembers(data) { return call('admin.member.list', data || {}); }
function adminUpdateMember(memberId, member) { return call('admin.member.update', { memberId: memberId, member: member }); }
function adminList() { return call('admin.list'); }
function adminSave(openid, role, status) { return call('admin.save', { openid: openid, role: role, status: status }); }
function adminRemove(adminId) { return call('admin.remove', { adminId: adminId }); }
function getPrintJobs() { return call('printer.jobs'); }
function reprint(orderId) { return call('printer.reprint', { orderId: orderId }); }
function uploadImage(base64, extension, kind) { return call('storage.upload', { base64: base64, extension: extension, kind: kind || 'dish' }); }
function deleteImage(fileID) { return call('storage.delete', { fileID: fileID }); }

module.exports = {
  init: init,
  call: call,
  getCurrentUser: getCurrentUser,
  updateMemberProfile: updateMemberProfile,
  getAppConfig: getAppConfig,
  getMenu: getMenu,
  getDish: getDish,
  getTables: getTables,
  quoteOrder: quoteOrder,
  createOrder: createOrder,
  getOrders: getOrders,
  getOrder: getOrder,
  cancelOrder: cancelOrder,
  getPayParams: getPayParams,
  adminDashboard: adminDashboard,
  adminOrders: adminOrders,
  adminUpdateOrder: adminUpdateOrder,
  adminDishes: adminDishes,
  adminSaveDish: adminSaveDish,
  adminDeleteDish: adminDeleteDish,
  adminCategories: adminCategories,
  adminSaveCategory: adminSaveCategory,
  adminDeleteCategory: adminDeleteCategory,
  adminTables: adminTables,
  adminSaveTable: adminSaveTable,
  adminDeleteTable: adminDeleteTable,
  adminMembers: adminMembers,
  adminUpdateMember: adminUpdateMember,
  adminList: adminList,
  adminSave: adminSave,
  adminRemove: adminRemove,
  getPrintJobs: getPrintJobs,
  reprint: reprint,
  uploadImage: uploadImage,
  deleteImage: deleteImage,
};
