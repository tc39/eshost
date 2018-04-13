var $ = {
  global: this,
  createRealm(options) {
    options = options || {};
    options.globals = options.globals || {};

    var realm = newGlobal();
    realm.eval(this.source);
    realm.$.source = this.source;
    realm.$.destroy = function () {
      if (options.destroy) {
        options.destroy();
      }
    };
    for(var glob in options.globals) {
      realm.$.global[glob] = options.globals[glob];
    }

    return realm.$;
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

    var hasEvalInWorker = typeof evalInWorker == "function";
    var hasMailbox = typeof setSharedArrayBuffer == "function" && typeof getSharedArrayBuffer == "function";
    var shellCode = hasMailbox && hasEvalInWorker;
    var hasThreads = helperThreadCount ? helperThreadCount() > 0 : true;
    var sabTestable = Atomics && SharedArrayBuffer && hasThreads && shellCode;

    if (!sabTestable) {
      return {
        _notAvailable() {
          /* See comment above. */
          if (!hasThreads && shellCode) {
            reportCompare(0,0);
            quit(0);
          }
          throw new Error("Agents not available");
        },
        start(script) { this._notAvailable() },
        broadcast(sab, id) { this._notAvailable() },
        getReport() { this._notAvailable() },
        sleep(s) { this._notAvailable() }
      }
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
      msg = "" + msg;
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
    leaving() {}
  };
  Atomics.add(_ia, ${_RDY_LOC}, 1);
  return agent;
})();`;
// END WORKER PREFIX

    return {
      _numWorkers: 0,
      _numReports: 0,
      _reportPtr: _FIRST,

      _bailIfNotAvailable() {
        if (!sabTestable) {
          // See comment above.
          if (!hasThreads && shellCode) {
            reportCompare(0,0);
            quit(0);
          }
          throw new Error("Agents not available");
        }
      },

      start(script) {
        this._bailIfNotAvailable();
        setSharedArrayBuffer(_ia.buffer);
        var oldrdy = Atomics.load(_ia, _RDY_LOC);
        evalInWorker(_worker_prefix + script);
        while (Atomics.load(_ia, _RDY_LOC) == oldrdy)
          ;
        this._numWorkers++;
      },

      broadcast(sab, id) {
        this._bailIfNotAvailable();
        setSharedArrayBuffer(sab);
        Atomics.store(_ia, _ID_LOC, id);
        Atomics.store(_ia, _ACK_LOC, 0);
        Atomics.add(_ia, _MSG_LOC, 1);
        while (Atomics.load(_ia, _ACK_LOC) < this._numWorkers)
          ;
        Atomics.add(_ia, _MSG_LOC, 1);
      },

      getReport() {
        this._bailIfNotAvailable();
        if (this._numReports == Atomics.load(_ia, _NUMTXT_LOC))
          return null;
        var s = "";
        var i = this._reportPtr;
        var len = _ia[i++];
        for ( let j=0 ; j < len ; j++ )
          s += String.fromCharCode(_ia[i++]);
        this._reportPtr = i;
        this._numReports++;
        return s;
      },

      sleep(s) {
        this._bailIfNotAvailable();
        Atomics.wait(_ia, _SLEEP_LOC, 0, s);
      },
    };
  })()
};
