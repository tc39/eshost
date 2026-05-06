/* run-test262 exposes a $262 object, so we need to redfine it for safe shortName mapping */
const qjs = globalThis["\x24262"];
const DollarCreateRealm = qjs.createRealm;
const DollarEvalScript = qjs.evalScript.bind(qjs);

var $262 = Object.assign({}, qjs);
$262.source = $SOURCE;
$262.destroy = function () {};
$262.gc = function () {
  throw new Test262Error("gc() not yet supported.");
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
