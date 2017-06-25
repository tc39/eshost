function promisify(api) {
  return function () {
    let args = Array.prototype.slice.call(arguments);
    return new Promise(function(res, rej) {

      args.push(function (err, result) {
        if (err) { return rej(err); }
        return res(result);
      });

      api.apply(null, args);
    });
  };
}

module.exports = promisify;