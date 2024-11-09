exports.openpgp = {
    generate: async (name, email) => {
        const openpgp = require('openpgp');
        const { privateKey, publicKey, revocationCertificate } = await openpgp.generateKey({
            date: new Date(Date.now()-1000), type: 'ecc', curve: 'brainpoolP512r1', userIDs: { name: name, email: email }, format: 'armored'
        });
        return { 
            priv: Buffer.from(privateKey).toString('base64'),
            pub: Buffer.from(publicKey).toString('base64'),
            revcert: Buffer.from(revocationCertificate).toString('base64')
        }
    }
}