/*---
description: Attempt to import a file that does not exist
features: [dynamic-import]
flags: [async]
---*/

import('./THIS_FILE_DOES_NOT_EXIST.js').catch(error => {
  assert(typeof error !== 'undefined');
}).then($DONE, $DONE);
