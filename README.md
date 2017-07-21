## eshost

Execute ECMAScript code uniformly across any ECMAScript host environment. See also [eshost-cli](https://github.com/bterlson/eshost-cli) for an easy way to use this library from the command line.

Using eshost, you can create an agent (eg. a web browser or a command-line ECMAScript host) and evaluate scripts within that agent. Code running within the agent has access to the eshost runtime API which enables code to evaluate scripts, create new realms, handle errors, and so forth all without worrying about the host-specific mechanisms for these capabilities are.

eshost consists of a wrapper around the various ways of executing a host and processing its output (called an Agent) and a runtime library for host-agnostic scripts to use.

### Installation

```
npm install eshost
```

### Supported Hosts

| Host | Supported Platforms | Download | Notes |
|------|---------------------|----------|-------|
| node | Any | https://nodejs.org | |
| ch | Any | [Download](https://github.com/Microsoft/ChakraCore/releases) or [build](https://github.com/Microsoft/ChakraCore/wiki/Building-ChakraCore) | Chakra console host. |
| d8 | Any | Build [from source](https://github.com/v8/v8) | v8 console host. Errors are reported on stdout. Use $.getGlobal and $.setGlobal to get and set properties of global objects in other realms. |
| jsshell | Any | [Download](https://archive.mozilla.org/pub/firefox/nightly/latest-mozilla-central/) | SpiderMonkey console host. |
| jsc | Mac¹ | Build [from source](http://trac.webkit.org/wiki/JavaScriptCore)² | |
| nashorn | Any | Build [from source](https://wiki.openjdk.java.net/display/Nashorn/Building+Nashorn) | |
| edge | Windows | | Errors reported from Microsoft Edge are all of type Error. Requires [Microsoft WebDriver](https://developer.microsoft.com/en-us/microsoft-edge/platform/documentation/dev-guide/tools/webdriver/) in your path. |
| chrome | Any | | Requires [ChromeDriver](https://sites.google.com/a/chromium.org/chromedriver/downloads) in your path.|
| firefox | Any | | Requires [GeckoDriver](https://github.com/mozilla/geckodriver/releases) in your path (possibly renamed to `wires`).|
| safari | Mac | | Requires (SafariDriver browser extension)[https://github.com/SeleniumHQ/selenium/wiki/SafariDriver]. |

* 1: It is possible to build jsc on other platforms, but not supported.
* 2: Also available on your Mac system at `/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Resources/jsc`.

### Examples

```js
const esh = require('eshost');
const agent = esh.createAgent('d8', { hostPath: 'path/to/d8.exe' });
const result = await agent.evalScript(`
  print(1+1);
`);
console.log(result.stdout);
```

## Documentation

### eshost API
#### supportedHosts

An array of supported host types.

#### createAgent(type: string, options = {}): Runner
Gets an instance of a runner for a particular host type. See the table above for supported host types.

##### Options

* **hostPath**: Path to host to execute. For console hosts, this argument is required. For the specific browser runners, hostPath is optional and if omitted, the location for that browser will be detected automatically.
* **hostArguments**:  Command line arguments used when invoking your host. Not supported for browser hosts. **hostArguments** is an array of strings as you might pass to Node's spawn API.
* **transform**: A function to map the source to some other source before running the result on the underlying host.
* **webHost**: for web browser hosts only; URL host name from which to serve browser assets; optional; defaults to `"localhost"`
* **webPort**: for web browser hosts only; URL port number from which to serve browser assets; optional; defaults to `1337`
* **capabilities**: for `remote` host only; the Selenium/WebDriver capabilities to request for the remote session; all specified attributes will be forwarded to the server; [a listing of available attributes is available in the Selenium project's wiki](https://github.com/SeleniumHQ/selenium/wiki/DesiredCapabilities); the following attributes are required:
  * **capabilities.browserName**
  * **capabilities.platform**
  * **capabilities.version**
* **webdriverServer**: for `remote` host only; URL of the WebDriver server to which commands should be issued
* **noKeepAlive**: for `remote` host only; controls whether a WebDriver command is sent with each script evaluation; defaults to `false`

##### "Keep Alive" signal

Some WebDriver service providers consider long-running sessions with no
WebDriver traffic as "timed out," and they may subsequently destroy such
sessions. Because `eshost` circumvents the WebDriver protocol to execute
scripts (using a separate WebSocket channel rather than the WebDriver "Execute
Script" command) sessions that are actually active may be interpreted as "timed
out." To avoid this, `eshost`'s WebDriver agent sends a "Get URL" WebDriver command
prior to each script execution and discards the result.

This behavior can be disabled via the `noKeepAlive` option.

### Agent API
#### initialize(): Promise<void>
Initializes the host and returns a promise that is resolved once the host is initialized. Command line hosts have no initialization as a new process is started for each execution.

This is called for you if you use the createAgent factory.

#### evalScript(code, options = {}): Promise<Result>
Executes `code` in the host using the _Script_ goal symbol. Returns a promise for a result object.

By default, a script will run in Eshost until the realm is destroyed. For most command-line hosts, this is done automatically when the script execution queues are empty. However, browsers will remain open waiting for more code to become available. Therefore, eshost will automatically append `$.destroy()` to the end of your scripts. This behavior is not correct if you are attempting to execute asynchronous code. In such cases, add `async: true` to the options.

Options:

* async: True if the test is expected to call `$.destroy()` on the root realm when it's finished. When false, $.destroy() is added for you.

#### stop(): Promise<void>
Stops the currently executing script. For a console host, this simply kills the child process. For browser hosts, it will kill the current window and create a new one.

#### destroy(): Promise<void>
Destroys the agent, closing any of its associated resources (eg. browser windows, child processes, etc.).

##### Result Object
An object with the following keys:

* stdout: anything printed to stdout (mostly what you print using `print`).
* stderr: anything printed to stderr
* error: if the script threw an error, it will be an error object. Else, it will be null.

The error object is similar to the error object you get in the host itself. Namely, it has the following keys:

* name: Error name (eg. SyntaxError, TypeError, etc.)
* message: Error message
* stack: An array of stack frames.

#### destroy(): Promise<void>
Tears down the agent. For browsers, this will close the browser window.

### Runtime Library

#### print(str)
Prints `str` to stdout.

#### $.global
A reference to the global object.

#### $.createRealm(options)
Creates a new realm, returning that realm's runtime library ($).

For example, creating two nested realms:

```js
$sub = $.createRealm();
$subsub = $sub.createRealm();
```

You can also use a destroy callback that gets called when the code inside the realm calls `$.destroy()`. For example:

```js
$sub = $.createRealm({
  destroy: function () {
    print('destroyed!')
  }
});

$sub.evalScript('$.destroy()'); // prints "destroyed!"
```

Options:

* globals: an object containing properties to add to the global object in the new realm.
* destroy: a callback that is called when the code executing in the realm destroys its realm (ie. by calling `$.destroy()`).

#### $.evalScript(code)
Creates a new script and evals `code` in that realm. If an error is thrown, it will be passed to the onError callback.

Scripts are different from eval in that lexical bindings go into the global lexical contour rather than being scoped to the eval.

#### $.destroy()
Destroys the realm. Note that in some hosts, $.destroy may not actually stop executing code in the realm or even destroy the realm.

#### $.getGlobal(name)
Gets a global property name.

#### $.setGlobal(name, value)
Sets a global property name to value.

### Running the tests

This project's tests can be executed with the following command:

    npm test

The above command will cause tests to be run against all supported hosts.
Executables for each host must be available on the system's `PATH` environment
variable.

One or more hosts may be skipped from the test run by setting corresponding
environment variables whose name match the pattern `ESHOST_SKIP_*`, where `*`
is the capitalized name of the host. For example, in a Unix-like system, the
following command executes the project's tests but skips JavaScriptCore and D8
tests:

    ESHOST_SKIP_JSC=1 ESHOST_SKIP_D8=1 npm test

Tests for the "remote" agent can be configured to run against any arbitrary
Selenium/WebDriver configuration through the specification of the following
environment variables: `ESHOST_REMOTE_BROWSERNAME`, `ESHOST_REMOTE_VERSION`,
`ESHOST_REMOTE_PLATFORM`. These values are used to define the host's
capabilities; see the above documentation of `eshost.createAgent` for more
details. For example, in a Unix-like system, the following command executes the
project's tests in a remote instance of the Firefox web browser:

    ESHOST_REMOTE_BROWSERNAME=firefox npm test
