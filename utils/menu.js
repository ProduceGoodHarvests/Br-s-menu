function normalizeDish(dish) {
  if (!dish) return null;
  return {
    _id: dish._id,
    id: dish._id,
    name: dish.name || '',
    cid: dish.cid || '',
    price: Number(dish.price || 0),
    stock: Number(dish.stock || 0),
    sales: Number(dish.sales || 0),
    img: dish.img || '',
    desc: dish.desc || '',
    spec: Array.isArray(dish.spec) ? dish.spec : [],
    status: dish.status === true,
    sort: Number(dish.sort || 100),
  };
}

function defaultSelections(dish) {
  var result = {};
  var spec = dish && Array.isArray(dish.spec) ? dish.spec : [];
  for (var i = 0; i < spec.length; i++) {
    if (spec[i].options && spec[i].options[0]) result[spec[i].name] = spec[i].options[0].name;
  }
  return result;
}

function findDish(dishes, id) {
  for (var i = 0; i < (dishes || []).length; i++) if (String(dishes[i]._id) === String(id)) return dishes[i];
  return null;
}

module.exports = { normalizeDish: normalizeDish, defaultSelections: defaultSelections, findDish: findDish };
