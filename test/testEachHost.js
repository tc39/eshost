let hosts;
try {
    hosts = require('./hosts.js');
} catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
        console.error('Could not find test/hosts.js -- see test/hosts.js.example for an example.');
        process.exit(1);
    } else {
        throw e;
    }
}
module.exports = function (description, cb) {
    describe(description, function () {
        hosts.forEach(record => {
            describe(`${record[1]} (${record[0]})`, function () {
                cb.call(this, record[0], record[1]);
            });
        })
    })
}
