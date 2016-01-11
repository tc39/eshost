var $ = {
  global: this,
  createRealm: function (globals) {
    globals = globals || {};

    var frame = document.createElement('iframe');
    document.body.appendChild(frame);
    var fwin = frame.contentWindow;
    var fdoc = fwin.document;
    var fscript = fdoc.createElement('script');
    fscript.textContent = this.source;
    fdoc.body.appendChild(fscript);
    fwin.$.source = this.source;
    fwin.$.socket = this.socket;

    for(var glob in globals) {
      fwin[glob] = globals[glob];
    }

    return fwin.$;
  },
  evalInNewRealm: function (code, globals, errorCb) {
    if (typeof globals === 'function') {
      errorCb = globals;
      globals = {};
    }

    var $child = this.createRealm(globals);

    $child.evalInNewScript(code, errorCb);
  },
  evalInNewScript: function (code, errorCb) {
    this.onNextError = errorCb;
    var s = document.createElement('script');
    s.textContent = code;
    document.body.appendChild(s);
    this.onNextError = null;
  },
  setGlobal: function (name, value) {
    this.global[name] = value;
  },
  _onError: function (err) {
    if (this.onNextError) {
      this.onNextError(err);
      this.onNextError = null;
    }
  },
  source: $SOURCE
};
this.window.onerror = function (msg, file, row, col, err) {
  if (!err) {
    // make up some error for Edge.
    err = {
      name: 'Error',
      message: msg
    };
  }

  $._onError(err)
}
function print(str) {
  $.socket.emit('print', str);
}
