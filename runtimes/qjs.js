/* run-test262 exposes a $262 object, so no need to define it */
$262.source = $SOURCE;
$262.destroy = function() {};
$262.IsHTMLDDA = function() {};
$262.gc = function() {
  throw new Test262Error('gc() not yet supported.');
};
$262.getGlobal = function(name) {
  return this.global[name];
};
$262.setGlobal = function(name, value) {
  this.global[name] = value;
};
