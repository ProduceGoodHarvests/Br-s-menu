function pad(n) {
  return n < 10 ? '0' + n : String(n);
}

function formatMoney(value) {
  var num = Number(value || 0);
  if (isNaN(num)) num = 0;
  return num.toFixed(2);
}

function formatDateTime(value) {
  if (!value) return '';

  var d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return String(value);

  return (
    d.getFullYear() +
    '-' +
    pad(d.getMonth() + 1) +
    '-' +
    pad(d.getDate()) +
    ' ' +
    pad(d.getHours()) +
    ':' +
    pad(d.getMinutes())
  );
}

function getSpecExtraPrice(option) {
  if (!option) return 0;

  var text = String(option);
  var match = text.match(/(?:\+|＋)\s*[¥￥]?(\d+(?:\.\d+)?)/);
  if (match) return Number(match[1]) || 0;

  return 0;
}

function calcUnitPrice(basePrice, specs) {
  var total = Number(basePrice || 0);
  var list = Array.isArray(specs) ? specs : [];

  for (var i = 0; i < list.length; i++) {
    total += getSpecExtraPrice(list[i].value);
  }

  return Number(total.toFixed(2));
}

function buildSpecKey(specs) {
  var list = Array.isArray(specs) ? specs : [];
  var parts = [];

  for (var i = 0; i < list.length; i++) {
    parts.push(list[i].name + ':' + list[i].value);
  }

  return parts.join('|');
}

function normalizeSpecs(specs) {
  var list = Array.isArray(specs) ? specs : [];
  var result = [];

  for (var i = 0; i < list.length; i++) {
    result.push({
      name: list[i].name,
      value: list[i].value,
    });
  }

  return result;
}

module.exports = {
  formatMoney: formatMoney,
  formatDateTime: formatDateTime,
  getSpecExtraPrice: getSpecExtraPrice,
  calcUnitPrice: calcUnitPrice,
  buildSpecKey: buildSpecKey,
  normalizeSpecs: normalizeSpecs,
};
