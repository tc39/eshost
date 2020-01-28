// No need to create $262 object as it is provided behind --experimental-options --js.test262-mode=true flags
$262.createRealm = function(options) {
  options = options || {};
  options.globals = options.globals || {};
  var realm = loadWithNewGlobal({ script: 'this', name: 'createRealm' });
  realm.eval(this.source);
  realm.$262.source = this.source;
  realm.$262.destroy = function () {
    if (options.destroy) {
      options.destroy();
    }
  };
  for(var glob in options.globals) {
    realm.$262.global[glob] = options.globals[glob];
  }
  return realm.$262;
};
$262.gc = function() {
  throw new Test262Error('GC not yet supported.');
};
$262.getGlobal = function(name) {
  return this.global[name];
};
$262.setGlobal = function(name, value) {
  this.global[name] = value;
};
$262.destroy = function () { /* noop */ };
$262.IsHTMLDDA = function() { return {}; };
$262.source = $SOURCE;
