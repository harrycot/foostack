exports.serialize_s2s = async (data, pub) => {
    const openpgp = require('openpgp');

    const _openpgp_local_pub = require('../memory').db.server.openpgp.pub;
    const _openpgp_local_priv = require('../memory').db.server.openpgp.priv;

    const _openpgp_local_priv_obj = await openpgp.readKey({ armoredKey: Buffer.from(_openpgp_local_priv, 'base64').toString() });

    const _message = data
        ? { text: `{ "uuid": "${require('../memory').db.server.uuid}", "data": "${
            Buffer.from(await openpgp.encrypt({
                message: await openpgp.createMessage({ text: data }),
                encryptionKeys: await openpgp.readKey({ armoredKey: Buffer.from(pub, 'base64').toString() }),
                signingKeys: _openpgp_local_priv_obj
            })).toString('base64')
        }" }` }
        : { text: `{ "uuid": "${require('../memory').db.server.uuid}", "pub": "${_openpgp_local_pub}" }` };

    const _unsigned = await openpgp.createCleartextMessage(_message);
    const _signed = await openpgp.sign({ message: _unsigned, signingKeys: _openpgp_local_priv_obj });

    return Buffer.from(_signed).toString('base64');
}

exports.deserialize_s2s = async (serialized_data) => {
    const openpgp = require('openpgp');

    const _signed = await openpgp.readCleartextMessage({ cleartextMessage: Buffer.from(serialized_data, 'base64').toString() });
    const _json_data = JSON.parse(_signed.text); _json_data.err = {};

    const _openpgp_local_priv = require('../memory').db.server.openpgp.priv;

    const _json_data_openpgp_pub_obj = !_json_data.data
        ? await openpgp.readKey({ armoredKey: Buffer.from(_json_data.pub, 'base64').toString() })
        : await openpgp.readKey({ armoredKey: Buffer.from(
            require('../memory').db.peers[require('../memory').db.get.peer.index(_json_data.uuid)].openpgp, 'base64').toString() });

    const _openpgp_local_priv_obj = await openpgp.readKey({ armoredKey: Buffer.from(_openpgp_local_priv, 'base64').toString() });

    const _verified = await openpgp.verify({ message: _signed, verificationKeys: _json_data_openpgp_pub_obj });
    
    const { verified } = _verified.signatures[0];

    try { await verified } catch (e) { _json_data.err.signature_clear = `clear: Signature could not be verified: ${e.message}` }

    if (_json_data.data) {
        const _message = await openpgp.readMessage({
            armoredMessage: Buffer.from(_json_data.data, 'base64').toString()
        });
        const { data: decrypted, signatures } = await openpgp.decrypt({
            message: _message,
            verificationKeys: _json_data_openpgp_pub_obj,
            decryptionKeys: _openpgp_local_priv_obj
        });
        try {
            await signatures[0].verified;
            _json_data.data = decrypted;
        } catch (e) {
            _json_data.err.signature_data = `data: Signature could not be verified: ${e.message}`
        }
    }

    return _json_data;
}

exports.get_http_headers = (content_type) => {
    // https://github.com/helmetjs/helmet
    return {
        'Content-Type': content_type,
        'Content-Security-Policy': "default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests",
        'Cross-Origin-Opener-Policy': "same-origin",
        'Cross-Origin-Resource-Policy': "same-origin",
        'Origin-Agent-Cluster': "?1",
        'Referrer-Policy': "no-referrer",
        //'Strict-Transport-Security': "max-age=15552000; includeSubDomains",
        'X-Content-Type-Options': "nosniff",
        'X-DNS-Prefetch-Control': "off",
        'X-Download-Options': "noopen",
        'X-Frame-Options': "DENY",
        'X-Permitted-Cross-Domain-Policies': "none",
        'X-XSS-Protection': "0"
    }
}

exports.is_port_available = (port) => {
    return new Promise((resolve, reject) => {
        const server = require('node:net').createServer();
        server.on('error', reject);
        server.listen(port, () => {
            server.off('error', reject);
            server.close();
            resolve(true);
        });
    });
}

exports.get_port_to_use = async (callback) => {
    const { port_range, network } = require('../memory').config;
    let port = port_range.start;
    while (!network.port && port <= port_range.end) {
        try {
            await this.is_port_available(port);
            callback(port);
        } catch (ex) {
            port++;
        }
    }
}
