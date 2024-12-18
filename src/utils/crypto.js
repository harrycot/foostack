exports.misc = {
    generate: {
        seed: (min, max, encoding) => { // return a random base64 seed of lenght between min and max             // min <= n < max !!!
            return {
                seed: Buffer.from(require('node:crypto').randomBytes(require('node:crypto').randomInt(min, max+1))).toString('base64'),
                issued: Date.now()
            }
        },
        seed_int: (min, max) => {             // min <= n < max !!!
            const _len = require('node:crypto').randomInt(min, max);
            let _seed = '';
            for (let index = 0; index <= _len; index++) {
                _seed += require('node:crypto').randomInt(0,9+1).toString();
            }
            return _seed;
        }
    }
}
