/* JavaScriptCore exposes a $ & $262 object to its runtime */
const jsc = globalThis["\x24"];
const DollarCreateRealm = jsc.createRealm;
const DollarEvalScript = jsc.evalScript.bind(jsc);

var $262 = {};
// Copy "own" properties from the JSC-defined object to the normalized `$262`
// object. Neither `Object.assign` nor the object "spread" syntax can be used
// for this task because not all properties on the source object are
// enumerable.
Object.getOwnPropertyNames(jsc).forEach(function (name) {
  $262[name] = jsc[name];
});
$262.global = globalThis;
$262.source = $SOURCE;
$262.destroy = function () {};
$262.gc = function () {
  return gc();
};
$262.evalScript = function (code) {
  try {
    DollarEvalScript(code);
    return { type: "normal", value: undefined };
  } catch (e) {
    return { type: "throw", value: e };
  }
};
$262.createRealm = function (options = {}) {
  const realm = DollarCreateRealm(options);
  realm.evalScript($262.source);
  realm.source = $262.source;
  realm.destroy = () => {
    if (options.destroy) {
      options.destroy();
    }
  };
  const globals = options.globals || {};
  for (let glob in globals) {
    realm.global[glob] = globals[glob];
  }
  return realm;
};

/* No IsHTMLDDA */
