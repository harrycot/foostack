exports.serialize_s2s = (data, pub) => {
    // pub is the ecdh pub of the destination
    const { uuid, keys, dhkeys } = require('../utils/crypto');
    
    const _keys_local_pub = keys.get.public.string();
    const _dhkeys_local_pub = dhkeys.get.public.string();

    const _data = data ? dhkeys.encrypt(data, pub) : '';
    //const _data = data ? keys.encrypt(data, pub) : '';
    const _data_signature = keys.sign(_data);
    const _uuid = Buffer.from(uuid.get()).toString('base64');
    const _uuid_signature = keys.sign(_uuid);

    // _final is different if it's for handshake or data
    const _final = data ? [_data, _data_signature, _uuid, _uuid_signature].join(':') : [_uuid, _uuid_signature, _keys_local_pub, _dhkeys_local_pub].join(':');

    return Buffer.from(_final).toString('base64');
}

exports.deserialize_s2s = (serialized_data) => {
    const { uuid, keys, dhkeys } = require('../utils/crypto');

    const _table = Buffer.from(serialized_data, 'base64').toString().split(':');

    // if it's an uuid at _table[0] => it's an handshake ; else it's data without ecdsa & ecdh
    const _json_data = uuid.validate(Buffer.from(_table[0], 'base64').toString()) ? {
        uuid: Buffer.from(_table[0], 'base64').toString(),
        uuid_signature: _table[1],
        pub: _table[2],
        dhpub: _table[3],
        err: {}
    } : {
        data: _table[0],
        data_signature: _table[1],
        uuid: Buffer.from(_table[2], 'base64').toString(),
        uuid_signature: _table[3],
        err: {}
    };

    // decrypt only if ecdsa check is valid
    if (_json_data.data) {
        const _peer = require('../memory').db.peers[require('../memory').db.get.peer.index(_json_data.uuid)];
        const is_verified_data = keys.verify(_table[0], _json_data.data_signature, _peer.pub);
        const is_verified_uuid = keys.verify(_table[2], _json_data.uuid_signature, _peer.pub);
        if (!is_verified_data) { _json_data.err.ecdsa_data = "data ecdsa signature error" }
        if (!is_verified_uuid) { _json_data.err.ecdsa_uuid = "uuid ecdsa signature error" }
        if (is_verified_data && is_verified_uuid) { // here decrypt using dh shared secret
            try { _json_data.data = dhkeys.decrypt(_json_data.data, _peer.dhpub) } catch (e) { _json_data.err.dh_data = `data dh decrypt error: ${e}` }
            //try { _json_data.data = keys.decrypt(_json_data.data) } catch (e) { _json_data.err.data = `data decrypt error: ${e}` }
        }
    } else {
        const is_verified_uuid = keys.verify(_table[0], _json_data.uuid_signature, _json_data.pub);
        if (!is_verified_uuid) { _json_data.err.ecdsa_uuid = "uuid ecdsa signature error" }
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
