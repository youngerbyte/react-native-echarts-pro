export default function toString(obj) {
  let result = JSON.stringify(obj, function (key, val) {
    if (typeof val === "function") {
      // This "replace function" is used to remove the useless line feeds among code.
      return `~--demo--~${val}~--demo--~`.replace(/\n/g, "");
    }
    return val;
  });

  do {
    result = result
      .replace('"~--demo--~', "")
      .replace('~--demo--~"', "")
      .replace(/\\\\/g, "\\") // When the formatter function convert to string, '\n' in the return string will be replaced by '\\n', this "replace function" will replace it back to line feed '\n'.
      .replace(/\\\"/g, '"'); //最后一个replace将release模式中莫名生成的\"转换成"
  } while (result.indexOf("~--demo--~") >= 0);
  // 添加此行把unicode转为中文（否则formatter函数中含有中文在release版本中显示不出来）
  result = unescape(result.replace(/\\u/g, "%u"));
  return result;
}


export function stringify(obj) {
  return JSON.stringify(obj, function (key, value) {
    var fnBody;
    if (value instanceof Function || typeof value == 'function') {


      fnBody = value.toString();

      if (fnBody.length < 8 || fnBody.substring(0, 8) !== 'function') { //this is ES6 Arrow Function
        return '_NuFrRa_' + fnBody;
      }
      return fnBody;
    }
    if (value instanceof RegExp) {
      return '_PxEgEr_' + value;
    }
    return value;
  });
}
