/* QuickJS exposes a $262 object to its runtime */
if (!$262) {
  /*
  These are implemented in run-test262.c:
    print()
    $262.detachArrayBuffer
    $262.agent.*

  Once QuickJS releases an updated version of run-test262,
  this whole section will not be necessary.
  */
  var $262 = {
    evalScript() {
      throw new Test262Error('evalScript not yet supported.');
    },
    detachArrayBuffer() {
      throw new Test262Error('detachArrayBuffer not yet supported.');
    },
    agent: {
      start() {
        throw new Test262Error('agent.start not yet supported.');
      },
      broadcast() {
        throw new Test262Error('agent.broadcast not yet supported.');
      },
      getReport() {
        throw new Test262Error('agent.getReport not yet supported.');
      },
      sleep() {
        throw new Test262Error('agent.sleep not yet supported.');
      },
      monotonicNow() {
        throw new Test262Error('agent.monotonicNow not yet supported.');
      },
    }
  };
}

$262.source = $SOURCE;
$262.destroy = function() {};
$262.IsHTMLDDA = function() {};
$262.gc = function() {
  throw new Test262Error('gc not yet supported.');
};
$262.createRealm = function() {
  throw new Test262Error('createRealm not yet supported.');
};
$262.getGlobal = function(name) {
  return this.global[name];
};
$262.setGlobal = function(name, value) {
  this.global[name] = value;
};
