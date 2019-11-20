// Copyright (C) 2019 Bocoup LLC. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.
/*---
description: This is just an .mjs test
esid: sec-parsemodule
flags: [module]
---*/
import { x } from './module_FIXTURE.mjs';
assert(x === 1);
