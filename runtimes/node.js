var vm = require('vm');
var $ = {
  global: this,
  createRealm: function (globals) {
    globals = globals || {};

    context = {
      console: console,
      require: require
    };

    for(var glob in globals) {
       context[glob] = globals[glob];
    }

    var context = vm.createContext(context);
    vm.runInContext(this.source, context);
    context.$.source = this.source;
    context.$.context = context;
    return context.$;
  },
  evalInNewRealm: function (code, globals, errorCb) {
    if (typeof globals === 'function') {
      errorCb = globals;
      globals = {};
    }

    $child = this.createRealm(globals);
    $child.evalInNewScript(code, errorCb);

    return $child;
  },
  evalInNewScript: function (code, errorCb) {
    try {
      if (this.context) {
        vm.runInContext(code, this.context, {displayErrors: false});
      } else {
        vm.runInThisContext(code, {displayErrors: false});
      }
    } catch (e) {
      if(errorCb) errorCb(e);
    }
  },
  setGlobal: function (name, value) {
    this.global[name] = value;
  },
  source: $SOURCE
};
function print() { console.log.apply(console, arguments) }
