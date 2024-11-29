const fs = require('node:fs');
const path = require('node:path');

const _exclude_node_modules_from_this_file = path.join(__dirname, '../node_modules/pkg/lib-es5/packer.js');
fs.readFile(_exclude_node_modules_from_this_file, 'utf8', (err,data) => { // https://stackoverflow.com/a/14181136
  if (err) { return console.log(err) }
  const result = data.replace("!hasAnyStore(record)", "!hasAnyStore(record) || (record.file.includes('node_modules') && process.env.NODE_ENV === 'production')");
  fs.writeFile(_exclude_node_modules_from_this_file, result, 'utf8', (err) => {
     if (err) { return console.log(err) }
  });
});