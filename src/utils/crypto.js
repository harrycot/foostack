const crypto = require('node:crypto');

const CONST_ALGORITHM = 'aes-256-cbc';
const CONST_ALGORITHM_LENGTH = 32; // 256 bits == 32 bytes/characters (32*8) 
const CONST_IV_LENGTH = 16; // IV => For AES, the size is always 16 (buffer) || 32 (hex) || 128 bits (16*8)

const CONST_HASH = 'sha512';
const CONST_CURVE_NAME = 'brainpoolP512r1';
const CONST_PRIV_KEY_TYPE = 'pkcs8';
const CONST_PUB_KEY_TYPE = 'spki';
const CONST_KEY_FORMAT = 'der';

exports.uuid = {
    generate: () => {
        return crypto.randomUUID();
    },
    validate: (uuid) => {
        const regex = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;
        return regex.test(uuid);
    },
    get: () => {
        return require('../memory').db.server.uuid;
    }
}

exports.keys = {
    generate: () => {
        //console.log(crypto.getCurves());
        const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: CONST_CURVE_NAME });
        //console.log(privateKey.export({ type: CONST_PRIV_KEY_TYPE, format: CONST_KEY_FORMAT })); // 189 Buffer length
        //console.log(publicKey.export({ type: CONST_PUB_KEY_TYPE, format: CONST_KEY_FORMAT })); // 124 Buffer length
        return {
            priv: Buffer.from(privateKey.export({ type: CONST_PRIV_KEY_TYPE, format: CONST_KEY_FORMAT })).toString('base64'),
            pub: Buffer.from(publicKey.export({ type: CONST_PUB_KEY_TYPE, format: CONST_KEY_FORMAT })).toString('base64')
        }
    },
    secret: (pub64) => {
        const ecdh = crypto.createECDH(CONST_CURVE_NAME);
        const pub = ecdh.generateKeys('base64');
        console.log(this.keys.get.private.string());
        console.log(ecdh.getPrivateKey('base64'));
        ecdh.setPrivateKey(this.keys.get.private.string(), 'base64');
        return ecdh.computeSecret(pub64, 'base64', 'hex');
    },
    encrypt: (data, pub64) => {
        const secret = this.keys.secret(pub64);
        return this.cipher(secret, data);
    },
    decrypt: (data, pub64) => {
        const secret = this.keys.secret(pub64);
        return this.decipher(secret, data);
    },
    sign: (data) => {
        const privateKey = this.keys.get.private.object()
        const sign = crypto.createSign(CONST_HASH);
        sign.update(data);
        sign.end();
        return sign.sign(privateKey, 'base64');
    },
    verify: (data, signature, pub64) => {
        const publicKey = this.keys.get.public.object(pub64);
        const verify = crypto.createVerify(CONST_HASH);
        verify.update(data);
        verify.end();
        return verify.verify(publicKey, signature, 'base64');
    },
    get: {
        public: {
            string: () => {
                return require('../memory').db.server.keys.pub;
            },
            object: (pub) => {
                const _pub = pub ? pub : this.keys.get.public.string();
                const publicKey = crypto.createPublicKey({
                    key: Buffer.from(_pub, 'base64'),
                    type: CONST_PUB_KEY_TYPE, format: CONST_KEY_FORMAT
                });
                return publicKey;
            }
        },
        private: {
            string: () => {
                return require('../memory').db.server.keys.priv;
            },
            object: () => {
                const privateKey = crypto.createPrivateKey({
                    key: Buffer.from(this.keys.get.private.string(), 'base64'),
                    type: CONST_PRIV_KEY_TYPE, format: CONST_KEY_FORMAT
                });
                return privateKey;
            }
        }
    }
}


// INPUT_DATA == String
// Return BASE64
exports.cipher = (secret, data) => {
    'use strict';
    const iv = crypto.randomBytes(CONST_IV_LENGTH); // return buffer 16 == 32 hex
    const key = crypto.scryptSync(secret, 'salt', CONST_ALGORITHM_LENGTH);
    const cipher = crypto.createCipheriv(CONST_ALGORITHM, Buffer.from(key), iv);

    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const final = iv.toString('hex') + encrypted.toString('hex');

    return Buffer.from(final, 'hex').toString('base64');
}

// INPUT_DATA == BASE64
// Return String
exports.decipher = (secret, b64, type) => {
    'use strict';
    const input_data = Buffer.from(b64, 'base64').toString('hex'); // tranform base64 input data to hex

    const iv = Buffer.from(input_data.slice(0, 32), 'hex'); // IV => For AES, the size is always 16 (buffer) || 32 (hex) || 128 bits
    const data = Buffer.from(input_data.slice(32), 'hex');
    const key = crypto.scryptSync(secret, 'salt', CONST_ALGORITHM_LENGTH);
    const decipher = crypto.createDecipheriv(CONST_ALGORITHM, Buffer.from(key), iv);

    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);

    return decrypted.toString();
}

