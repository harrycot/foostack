exports.uuid = {
    generate: () => {
        return require('node:crypto').randomUUID();
    },
    validate: (uuid) => {
        const regex = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;
        return regex.test(uuid);
    }
}

exports.openpgp = {
    generate: async (name, email) => {
        const openpgp = require('openpgp');
        const { privateKey, publicKey, revocationCertificate } = await openpgp.generateKey({
            type: 'ecc', curve: 'brainpoolP512r1', userIDs: { name: name, email: email }, format: 'armored'
        });
        return { 
            priv: Buffer.from(privateKey).toString('base64'),
            pub: Buffer.from(publicKey).toString('base64'),
            revcert: Buffer.from(revocationCertificate).toString('base64')
        }
    }
}

exports.misc = {
    generate: {
        secret: () => { // will be used by session
            return {
                secret: Buffer.from(require('node:crypto').randomBytes(require('node:crypto').randomInt(100, 200))).toString('base64'),
                issued: Date.now()
            }
        }
    }
}