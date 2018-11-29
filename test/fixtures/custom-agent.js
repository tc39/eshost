'use strict';

const util = require('util');

module.exports = (Agent) => {
  class CustomAgent extends Agent {
    constructor(options) {
      super(options);
      this.stdout = '';
    }

    evalScript(code) {
      const print = (v) => {
        this.stdout += util.inspect(v) + '\n';
      };
      try {
        eval(code);
        return Promise.resolve({ stdout: this.stdout, stderr: '', error: null });
      } catch (error) {
        return Promise.resolve({ stdout: '', stderr: '', error });
      }
    }

    stop() {
      this.stdout = '';
      return super.stop();
    }

    destroy() {
      this.stdout = '';
      return super.destroy();
    }
  }

  return CustomAgent;
};
