/* --test262 exposes a native $262 object so we need to redfine it for safe shortName mapping */
const q262 = globalThis["\x24262"];
const DollarCreateRealm = q262.createRealm;
const DollarEvalScript = q262.evalScript.bind(q262);

var $262 = {};
for (const name of Object.getOwnPropertyNames(q262)) {
  $262[name] = q262[name];
}
$262.source = $SOURCE;
$262.destroy = function () {};
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
  // A fresh Quanta realm has no `print`; eshost's contract expects one.
  if (typeof realm.global.print === "undefined") {
    realm.global.print = print;
  }
  // The realm object's own createRealm is native; route nested realms through
  // this shim too so they get `print` and the eshost $262 API.
  realm.createRealm = $262.createRealm;
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
