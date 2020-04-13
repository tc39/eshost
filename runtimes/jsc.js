/* JavaScriptCore exposes a $ & $262 object to its runtime */
$262.source = $SOURCE;
$262.destroy = function() {};
$262.getGlobal = function(name) {
  return this.global[name];
};
$262.setGlobal = function(name, value) {
  this.global[name] = value;
};
$262.gc = function() {
  return gc();
};
