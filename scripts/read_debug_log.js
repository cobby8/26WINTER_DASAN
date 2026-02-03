
const fs = require('fs');
const content = fs.readFileSync('debug_page_log.txt', 'utf8');
const lines = content.trim().split('\n');
const lastLine = lines[lines.length - 1];
console.log('--- Last Log Line ---');
console.log(lastLine.split(', ').join('\n'));
