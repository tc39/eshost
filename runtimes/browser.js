var $ = {
  global: this,
  createRealm: function (options) {
    options = options || {};
    const globals = options.globals || {};

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

    fwin.$.destroy = function () {
      document.body.removeChild(frame);

      if (options.destroy) {
        options.destroy();
      }
    }

    return fwin.$;
  },
  evalScript: function (code, options) {
    options = options || {};

    var s = document.createElement('script');
    s.textContent = code;
    var error = null;
    window.onerror = function (msg, file, row, col, err) {
      if (!err) {
        // make up some error for Edge.
        err = {
          name: 'Error',
          message: msg
        };
      }

      error = err;
    }
    document.body.appendChild(s);
    if (window) {
      window.onerror = null;
    }

    if (error) {
      return { type: 'throw', value: error };
    } else {
      return { type: 'normal', value: undefined };
    }
  },
  getGlobal: function (name) {
    return this.global[name];
  },
  setGlobal: function (name, value) {
    this.global[name] = value;
  },
  destroy: function() {
    $.socket.emit('destroy')
  },
  source: $SOURCE
};

function print(str) {
  $.socket.emit('print', str);
}
