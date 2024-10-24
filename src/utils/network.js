exports.serialize_s2s = (data, pub) => {
    // pub is the ecdh pub of the destination
    const { uuid, ecdsa, ecdh, hmac } = require('../utils/crypto');
    
    const _ecdsa_local_pub = ecdsa.local.get.public.string();
    const _ecdh_local_pub = ecdh.local.get.public.string();

    const _data = data ? Buffer.from(ecdh.encrypt(data, pub)).toString('base64') : '';
    const _data_signature = Buffer.from(ecdsa.sign(_data)).toString('base64');
    const _uuid = Buffer.from(uuid.get()).toString('base64');
    const _uuid_signature = Buffer.from(ecdsa.sign(_uuid)).toString('base64');

    // _prefinal is different if it's for handshake or data
    const _prefinal = data ? [_data, _data_signature, _uuid, _uuid_signature].join(':') : [_uuid, _uuid_signature, _ecdsa_local_pub, _ecdh_local_pub].join(':');
    const _hmac = hmac.get.base64(_prefinal);

    const _final = [_prefinal, _hmac].join(':');

    return Buffer.from(_final).toString('base64');
}

exports.deserialize_s2s = (serialized_data) => {
    const { uuid, hmac, ecdsa, ecdh } = require('../utils/crypto');

    const _table = Buffer.from(serialized_data, 'base64').toString().split(':');
    const _hmac_to_compute = [_table[0], _table[1], _table[2], _table[3]].join(':');

    // if it's an uuid at _table[0] => it's an handshake ; else it's data without ecdsa & ecdh
    const _json_data = uuid.validate(Buffer.from(_table[0], 'base64').toString()) ? {
        uuid: Buffer.from(_table[0], 'base64').toString(),
        uuid_signature: Buffer.from(_table[1], 'base64').toString(),
        ecdsa: _table[2],
        ecdh: _table[3],
        hmac: _table[4], err: {}
    } : {
        data: Buffer.from(_table[0], 'base64').toString(),
        data_signature: Buffer.from(_table[1], 'base64').toString(),
        uuid: Buffer.from(_table[2], 'base64').toString(),
        uuid_signature: Buffer.from(_table[3], 'base64').toString(),
        hmac: _table[4], err: {}
    };

    // perform hmac and ecdsa check
    if (hmac.get.base64(_hmac_to_compute) !== _json_data.hmac) {
        _json_data.err.hmac = "hmac does not match";
    }
    if (_json_data.data) {
        const _peer = require('../memory').db.peers[require('../memory').db.get.peer.index(_json_data.uuid)];

        if (ecdsa.verify(_json_data.data, ecdsa.build.public(_peer.ecdsa), _json_data.data_signature)) {
            _json_data.err.ecdsa_data = "data ecdsa signature error";
        } else {
            _json_data.data = ecdh.decrypt(_json_data.data, _peer.ecdh);
        }
        if (ecdsa.verify(_json_data.uuid, ecdsa.build.public(_peer.ecdsa), _json_data.uuid_signature)) {
            _json_data.err.ecdsa_uuid = "uuid ecdsa signature error";
        }
    } else {
        if (ecdsa.verify(_json_data.uuid, ecdsa.build.public(_json_data.ecdsa), _json_data.uuid_signature)) {
            _json_data.err.ecdsa_uuid = "uuid ecdsa signature error";
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
        const server = require('net').createServer();
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



//////////////////////////


exports.get_external_ipv4 = () => {
    const ifaces = require('os').networkInterfaces();
    console.log(ifaces);
    let address;
    for (const dev in ifaces) {
        const iface = ifaces[dev].filter((details) => {
            return details.family === 'IPv4' && details.internal === false;
        });
        if (iface.length > 0) address = iface[0].address;
        return address;
    }
}

exports.dns_lookup = (domain) => {
    require('dns').lookup(domain, (err, address, family) => {
        //if (memory.is_production) { console.log('address: %j family: IPv%s', address, family) };
        //this.ioc.push({ server: address });
    });
}


