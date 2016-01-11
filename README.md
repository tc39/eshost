## es-host-wrapper

Es-host-wrapper is a library for executing ECMAScript code uniformly across any ECMAScript host environment. Es-host-wrapper consists of a wrapper around the various ways of executing a host and processing its output (called a Runner) and a runtime library for host-agnostic scripts to use.

### Installation

```
npm install es-host-wrapper
```

### Supported Hosts
* Browsers (Tested with Edge, Chrome, and Firefox)
* Node
* d8 (v8 console host)
* jsshell (SpiderMonkey console host)
* ch.exe (Chakra console host)

### Examples

```js
const runner = js.getRunner('path/to/d8.exe', 'd8');
runner.exec(`
  print(1+1);
`).then(result => console.log(result.stdout));
```

## Documentation

### es-host-wrapper API

#### getRunner(path, type, arguments)
Gets an instance of a runner for a particular host type. Supported host types:

* browser
* node
* d8
* jsshell
* ch

Creating a runner may start the host (eg. for the browser, creating the host executes the browser process).

You can pass command line arguments to the host process using the arguments option. It is an array of strings as you might pass to Node's spawn API.

### Runner API

#### exec(code)
Executes `code` in the host. Returns a result object.

##### Result Object
An object with the following keys:

* stdout: anything printed to stdout (mostly what you print using `print`).
* stderr: anything printed to stderr
* error: if the script threw an error, it will be an error object. Else, it will be null.

The error object is similar to the error object you get in the host itself. Namely, it has the following keys:

* name: Error name (eg. SyntaxError, TypeError, etc.)
* message: Error message
* stack: An array of stack frames.

### Runtime Library

#### print(str)
Prints `str` to stdout.

#### $.global
A reference to the global object.

#### $.createRealm(globals)
Creates a new realm, returning that realm's runtime library ($).

For example, creating two nested realms:

```js
$sub = $.createRealm();
$subsub = $sub.createRealm();
```

#### $.evalInNewRealm(code, onError)
Creates a new realm and evals `code` in that realm. If an error is thrown, it will be passed to the onError callback.

#### $.evalInNewScript(code, onError)
Creates a new script and evals `code` in that realm. If an error is thrown, it will be passed to the onError callback.

Scripts are different from eval in that lexical bindings go into the global lexical contour rather than being scoped to the eval.

#### $.setGlobal(name, value)
Sets a global property name to value.

### Host-specific notes

* *Microsoft Edge*: All reported errors are of type Error, as Edge does not allow capturing actual error objects via window.onerror.
* *d8*:
  * Errors are reported on stdout so error results will also contain much stdout text.
  * You cannot set properties of other global objects directly. Instead, use `$.setGlobal`.
