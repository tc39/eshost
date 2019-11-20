module.exports = function(api) {
  return function(...args) {
    return new Promise((resolve, reject) => {
      args.push((error, result) => {
        if (error) {
          return reject(error);
        }
        return resolve(result);
      });
      api(...args);
    });
  };
};

