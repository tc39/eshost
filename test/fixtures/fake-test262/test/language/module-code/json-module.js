// Copyright (C) 2021 the V8 project authors. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.
/*---
description: This is a test for loading files with a `.json` extension.
esid: sec-parsemodule
flags: [module]
---*/

import './json-module_FIXTURE.json';

/**
 * At the time of this writing, neither the "import assertions" proposal [1]
 * nor the "JSON modules" proposal [2] are widely implemented. In order to
 * verify that the harness correctly identifies JSON dependencies without
 * requiring the new semantics, this test simply loads a JSON file which
 * happens to parse as JavaScript, and it does not validate the exported value.
 */
