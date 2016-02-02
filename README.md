## eshost

eshost is a library for executing ECMAScript code uniformly across any ECMAScript host environment. eshost consists of a wrapper around the various ways of executing a host and processing its output (called a Runner) and a runtime library for host-agnostic scripts to use.

For a CLI tool that uses this library to make comparing ECMAScript hosts super easy, see [eshost-cli](https://github.com/bterlson/eshost-cli).

### Installation

```
npm install eshost
```

### Supported Hosts

| Host | Supported Platforms | Download | Notes |
|------|---------------------|----------|-------|
| browser | Any | | Errors reported from Microsoft Edge are all of type Error. |
| node | Any | https://nodejs.org | |
| ch | Windows | Built [from source](https://github.com/microsoft/chakracore)| Chakra console host. |
| d8 | Any | Built [from source](https://github.com/v8/v8) | v8 console host. Errors are reported on stdout. Use $.getGlobal and $.setGlobal to get and set properties of global objects in other realms. |
| jsshell | Any | [Download](https://archive.mozilla.org/pub/firefox/nightly/latest-mozilla-central/) | SpiderMonkey console host. |
| jsc | Mac | Built [from source](http://trac.webkit.org/wiki/JavaScriptCore)¹ | |
| nashorn | Any | Built [from source](https://wiki.openjdk.java.net/display/Nashorn/Building+Nashorn) | |

1: Also available on your Mac system at `/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Resources/jsc`.

### Examples

```js
const runner = js.getRunner('path/to/d8.exe', 'd8');
runner.exec(`
  print(1+1);
`).then(result => console.log(result.stdout));
```

## Documentation

### eshost API
#### supportedHosts

An array of supported host types.

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

#### $.getGlobal(name)
Gets a global property name.

#### $.setGlobal(name, value)
Sets a global property name to value.
