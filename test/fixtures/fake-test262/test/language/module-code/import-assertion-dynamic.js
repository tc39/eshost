/*---
description: Dynamic import assertions
info: |
  This test approximates the "import assertions" syntax using code comments in
  order to support improvements to ESHost's dependency inferrence logic while
  still passing in runtimes which do not yet support the proposed language
  extension.
esid: sec-moduleevaluation
flags: [module, async]
---*/

Promise.all([
  import('./import-assertion-1_FIXTURE.js'),//, {'':''})
  import("./import-assertion-2_FIXTURE.js"),//, {"":""})
]).then(function(values) {
  assert.sameValue(values[0].default, 1);
  assert.sameValue(values[1].default, 2);
}).then($DONE, $DONE);
