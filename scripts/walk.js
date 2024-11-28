const fs = require('node:fs');

exports.walk = (dir, done) => { // https://gist.github.com/h2non/5214201
    var results = [];
    fs.readdir(dir, function(err, list) {
      if (err) return done(err);
      var i = 0;
      (function next() {
        var file = list[i++];
        if (!file) return done(null, results);
        file = dir + '/' + file;
        fs.stat(file, function(err, stat) {
          if (stat && stat.isDirectory()) { //  && !file.includes('node_modules')
            require('./walk').walk(file, function(err, res) {
              results = results.concat(res);
              next();
            });
          } else {
            results.push(file);
            next();
          }
        });
      })();
    });
}

exports.walk_sync = (dir) => { // https://stackoverflow.com/a/16684530
  var results = [];
  var list = fs.readdirSync(dir);
  list.forEach((file) => {
      file = dir + '/' + file;
      var stat = fs.statSync(file);
      if (stat && stat.isDirectory()) { 
          /* Recurse into a subdirectory */
          results = results.concat(require('./walk').walk_sync(file));
      } else { 
          /* Is a file */
          results.push(file);
      }
  });
  return results;
}
