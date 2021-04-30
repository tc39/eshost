/*---
description: Static import assertions
info: |
  This test approximates the "import assertions" syntax using code comments in
  order to support improvements to ESHost's dependency inferrence logic while
  still passing in runtimes which do not yet support the proposed language
  extension.
esid: sec-moduleevaluation
flags: [module]
---*/

import one from './import-assertion-1_FIXTURE.js'// assert {'':''};
import two from "./import-assertion-2_FIXTURE.js"// assert {"":""};
import './import-assertion-3_FIXTURE.js'// assert {'':''};
import "./import-assertion-4_FIXTURE.js"// assert {"":""};

assert.sameValue(one, 1);
assert.sameValue(two, 2);
