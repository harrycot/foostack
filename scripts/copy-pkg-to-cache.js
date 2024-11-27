const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const CONST_DEST_FOLDER = path.join(process.env.HOME, '/.pkg-cache/v3.4');


if (!fs.existsSync(path.join(process.env.HOME, '/.pkg-cache'))) { fs.mkdirSync(path.join(process.env.HOME, '/.pkg-cache')) }
if (!fs.existsSync(path.join(process.env.HOME, '/.pkg-cache/v3.4'))) { fs.mkdirSync(path.join(process.env.HOME, '/.pkg-cache/v3.4')) }

require('./walk').walk(path.join(__dirname, '../pkg-bin'), function(err, results) {
    if (err) throw err;
    console.log('\n\n  => Reading files\n');

    results.forEach((file, i) => {
        if (!file.includes('.sha256sum')) {
            const _file_sum = fs.readFileSync(`${file}.sha256sum`, 'utf8').split('  ')[0];
            const _hash = crypto.createHash('sha256');
            const _input = fs.createReadStream(file);
            _input.on('readable', () => {
                const __data = _input.read();
                if (__data) {
                    _hash.update(__data);
                } else {
                    if (_file_sum === _hash.digest('hex')) {
                        const _new_filename = file.split('/')[file.split('/').length-1].replace('node-', 'fetched-');
                        const _new_filepath = path.join(CONST_DEST_FOLDER, _new_filename)
                        fs.copyFileSync(file, _new_filepath);
                        console.log(`cp:  ${file}  =>  ${_new_filepath}`);
                    }
                }
            });
        }
    });
});
