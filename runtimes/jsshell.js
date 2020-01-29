var $262 = {
  global: Function('return this')(),
  gc() {
    return gc();
  },
  createRealm(options) {
    options = options || {};
    options.globals = options.globals || {};

    var realm = newGlobal();
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
  },
  evalScript(code) {
    try {
      evaluate(code);
      return { type: 'normal', value: undefined };
    } catch (e) {
      return { type: 'throw', value: e };
    }
  },
  getGlobal(name) {
    return this.global[name];
  },
  setGlobal(name, value) {
    this.global[name] = value;
  },
  destroy() { /* noop */ },
  IsHTMLDDA() {
    /* objectEmulatingUndefined was replaced by createIsHTMLDDA in newer SpiderMonkey builds. */
    if (typeof createIsHTMLDDA === 'function') {
      return createIsHTMLDDA();
    }
    return objectEmulatingUndefined();
  },
  source: $SOURCE,
  /* https://github.com/mozilla/gecko-dev/blob/b9f0fcc3d6c0e9fffe5208212553aedd51e1428c/js/src/builtin/TestingFunctions.cpp */
  detachArrayBuffer,
  agent: (function () {
    /*
      This Source Code Form is subject to the terms of the Mozilla Public
      License, v. 2.0. If a copy of the MPL was not distributed with this
      file, You can obtain one at http://mozilla.org/MPL/2.0/.

      This agent source is adapted from
      https://github.com/mozilla/gecko-dev/blob/master/js/src/tests/test262-host.js
    */

    /*
      SpiderMonkey complication: With run-time argument --no-threads
      our test runner will not properly filter test cases that can't be
      run because agents can't be started, and so we do a little
      filtering here: We will quietly succeed and exit if an agent test
      should not have been run because threads cannot be started.

      Firefox complication: The test cases that use $262.agent can't
      currently work in the browser, so for now we rely on them not
      being run at all.
    */

    var hasEvalInWorker = typeof evalInWorker === 'function';
    var hasMailbox = typeof setSharedArrayBuffer === 'function' &&
                      typeof getSharedArrayBuffer == 'function';
    var shellCode = hasMailbox && hasEvalInWorker;
    var hasThreads = helperThreadCount ? helperThreadCount() > 0 : true;
    var sabTestable = Atomics && SharedArrayBuffer && hasThreads && shellCode;


    // Date.now() is an invalid substitute for monotonicNow,
    // but until jsshell exposes the function we need, Date.now()
    // is the closest thing available.
    // Ref: https://bugzilla.mozilla.org/show_bug.cgi?id=1457560
    var monotonicNow = typeof monotonicNow === 'function' ? monotonicNow : Date.now;

    function thrower() {
      throw new Test262Error('agent.* not yet supported.');
    }

    if (!sabTestable) {
      return {
        start: thrower,
        broadcast: thrower,
        getReport: thrower,
        sleep: thrower,
      };
    }

    // The SpiderMonkey implementation uses a designated shared buffer _ia
    // for coordination, and spinlocks for everything except sleeping.

    var _MSG_LOC = 0;           // Low bit set: broadcast available; High bits: seq #
    var _ID_LOC = 1;            // ID sent with broadcast
    var _ACK_LOC = 2;           // Worker increments this to ack that broadcast was received
    var _RDY_LOC = 3;           // Worker increments this to ack that worker is up and running
    var _LOCKTXT_LOC = 4;       // Writer lock for the text buffer: 0=open, 1=closed
    var _NUMTXT_LOC = 5;        // Count of messages in text buffer
    var _NEXT_LOC = 6;          // First free location in the buffer
    var _SLEEP_LOC = 7;         // Used for sleeping

    var _FIRST = 10;            // First location of first message

    var _ia = new Int32Array(new SharedArrayBuffer(65536));
    _ia[_NEXT_LOC] = _FIRST;

    var _worker_prefix =
// BEGIN WORKER PREFIX
`
if (typeof $262 == 'undefined') {
  $262 = {};
}
var monotonicNow = typeof monotonicNow === 'function' ? monotonicNow : Date.now;
$262.agent = (function () {
  var _ia = new Int32Array(getSharedArrayBuffer());
  var agent = {
    receiveBroadcast(receiver) {
      var k;
      while (((k = Atomics.load(_ia, ${_MSG_LOC})) & 1) == 0)
          ;
      var received_sab = getSharedArrayBuffer();
      var received_id = Atomics.load(_ia, ${_ID_LOC});
      Atomics.add(_ia, ${_ACK_LOC}, 1);
      while (Atomics.load(_ia, ${_MSG_LOC}) == k)
          ;
      receiver(received_sab, received_id);
    },
    report(msg) {
      while (Atomics.compareExchange(_ia, ${_LOCKTXT_LOC}, 0, 1) == 1)
          ;
      msg = '' + msg;
      var i = _ia[${_NEXT_LOC}];
      _ia[i++] = msg.length;
      for ( let j=0 ; j < msg.length ; j++ )
          _ia[i++] = msg.charCodeAt(j);
      _ia[${_NEXT_LOC}] = i;
      Atomics.add(_ia, ${_NUMTXT_LOC}, 1);
      Atomics.store(_ia, ${_LOCKTXT_LOC}, 0);
    },
    sleep(s) {
      Atomics.wait(_ia, ${_SLEEP_LOC}, 0, s);
    },
    leaving() {},
    monotonicNow,
  };
  Atomics.add(_ia, ${_RDY_LOC}, 1);
  return agent;
})();`;
// END WORKER PREFIX

    return {
      _numWorkers: 0,
      _numReports: 0,
      _reportPtr: _FIRST,

      start(script) {
        setSharedArrayBuffer(_ia.buffer);
        var oldrdy = Atomics.load(_ia, _RDY_LOC);
        evalInWorker(_worker_prefix + script);
        while (Atomics.load(_ia, _RDY_LOC) == oldrdy)
          ;
        this._numWorkers++;
      },

      broadcast(sab, id) {
        setSharedArrayBuffer(sab);
        Atomics.store(_ia, _ID_LOC, id);
        Atomics.store(_ia, _ACK_LOC, 0);
        Atomics.add(_ia, _MSG_LOC, 1);
        while (Atomics.load(_ia, _ACK_LOC) < this._numWorkers)
          ;
        Atomics.add(_ia, _MSG_LOC, 1);
      },

      getReport() {
        if (this._numReports == Atomics.load(_ia, _NUMTXT_LOC)) {
          return null;
        }
        var s = '';
        var i = this._reportPtr;
        var len = _ia[i++];
        for ( let j=0 ; j < len ; j++ )
          s += String.fromCharCode(_ia[i++]);
        this._reportPtr = i;
        this._numReports++;
        return s;
      },

      sleep(s) {
        Atomics.wait(_ia, _SLEEP_LOC, 0, s);
      },

      monotonicNow,
    };
  })()
};
