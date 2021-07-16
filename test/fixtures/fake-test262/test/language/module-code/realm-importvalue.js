// Copyright (C) 2021 Rick Waldron. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.
/*---
description: Realm.prototype.importValue() returns a Promise object.
esid: sec-import-call-runtime-semantics-evaluation
features: [callable-boundary-realms]
flags: [module, async]
info: |
  Realm.prototype.importValue ( specifier, exportName )

  1. Let O be this value.
  2. Perform ? ValidateRealmObject(O).
  3. Let specifierString be ? ToString(specifier).
  4. Let exportNameString be ? ToString(exportName).
  5. Let callerRealm be the current Realm Record.
  6. Let evalRealm be O.[[Realm]].
  7. Let evalContext be O.[[ExecutionContext]].
  8. Return ? RealmImportValue(specifierString, exportNameString, callerRealm, evalRealm, evalContext).

  RealmImportValue ( specifierString, exportNameString, callerRealm, evalRealm, evalContext )
  1. Assert: Type(specifierString) is String.
  2. Assert: Type(exportNameString) is String.
  3. Assert: callerRealm is a Realm Record.
  4. Assert: evalRealm is a Realm Record.
  5. Assert: evalContext is an execution context associated to a Realm instance's [[ExecutionContext]].
  6. Let innerCapability be ! NewPromiseCapability(%Promise%).
  7. Let runningContext be the running execution context.
  8. If runningContext is not already suspended, suspend runningContext.
  9. Push evalContext onto the execution context stack; evalContext is now the running execution context.
  10. Perform ! HostImportModuleDynamically(null, specifierString, innerCapability).
  11. Suspend evalContext and remove it from the execution context stack.
  12. Resume the context that is now on the top of the execution context stack as the running execution context.
  13. Let steps be the steps of an ExportGetter function as described below.
  14. Let onFulfilled be ! CreateBuiltinFunction(steps, 1, "", « [[ExportNameString]] », callerRealm).
  15. Set onFulfilled.[[ExportNameString]] to exportNameString.
  16. Let promiseCapability be ! NewPromiseCapability(%Promise%).
  17. Return ! PerformPromiseThen(innerCapability.[[Promise]], onFulfilled, callerRealm.[[Intrinsics]].[[%ThrowTypeError%]], promiseCapability).
---*/

if (typeof Realm === 'function') {
  const r = new Realm();
  r.importValue('./realm-importvalue_FIXTURE.js', 'x').then(x => {

    assert.sameValue(x, 1);

  }).then($DONE, $DONE);
} else {
  $DONE();
}