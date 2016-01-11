"use strict";

const fs = require('fs');
const runtime = process.argv[2];

let file = fs.readFileSync(runtime, 'utf-8');
let src = file.replace(/\$SOURCE/, '""');
src = file.replace('$SOURCE', JSON.stringify(src));
console.log(src);
