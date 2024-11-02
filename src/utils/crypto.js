exports.misc = {
    generate: {
        seed: (min, max) => { // return a random base64 seed of lenght between min and max
            return {
                seed: Buffer.from(require('node:crypto').randomBytes(require('node:crypto').randomInt(min, max))).toString('base64'),
                issued: Date.now()
            }
        }
    }
}