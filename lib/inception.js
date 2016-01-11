module.exports = function (runtimeStr) {
  const runtimeInception = runtimeStr.replace('$SOURCE', '""');
  return runtimeStr.replace('$SOURCE', JSON.stringify(runtimeInception));
}
