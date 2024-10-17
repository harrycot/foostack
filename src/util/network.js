
exports.serialize_handshake_s2s = () => {
    const { uuid, ecdsa, ecdh, hmac } = require('../server').util.crypto;

    const _uuid = Buffer.from(uuid.get()).toString('base64');
    const _signature = Buffer.from(ecdsa.sign(_uuid)).toString('base64');

    const _ecdsa = ecdsa.local.get.public.string();
    const _ecdh = ecdh.local.get.public.string();

    const _prefinal = [_uuid, _signature, _ecdsa, _ecdh].join(':');
    const _hmac = hmac.get.base64(_prefinal);

    const _final = [_prefinal, _hmac].join(':');

    return Buffer.from(
        _final
    ).toString('base64');
}

exports.deserialize_handshake_s2s = (data) => {
    const { hmac, ecdsa } = require('../server').util.crypto;

    const _table = Buffer.from(data, 'base64').toString().split(':');
    const _hmac_to_compute = [_table[0], _table[1], _table[2], _table[3]].join(':');

    const json = {
        uuid: Buffer.from(_table[0], 'base64').toString(),
        signature: Buffer.from(_table[1], 'base64').toString(),
        ecdsa: _table[2],
        ecdh: _table[3],
        hmac: _table[4],
        err: {}
    }

    if (hmac.get.base64(_hmac_to_compute) !== json.hmac) {
        json.err.hmac = "hmac does not match";
    }
    if (ecdsa.verify(_table[0], ecdsa.build.public(json.ecdsa), json.signature)) {
        json.err.ecdsa = "ecdsa signature error";
    }

    return json;
}

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
        //if (this.package_details.is_production) { console.log('address: %j family: IPv%s', address, family) };
        //this.ioc.push({ server: address });
    });
}

exports.is_port_available = (port, callback) => {
    const server = require('net').createServer();
    server.listen(port).on('error', (err) => {
        if (err.code === 'EADDRINUSE') { callback(false) }
    }).on('listening', () => { server.close(); callback(true) });
}


exports.get_port_to_use = (callback) => {
    const { allowed_port_range } = require('../server').package_details;
    for (let port = allowed_port_range.start; port <= allowed_port_range.end; port++) {
        if (!require('../server').package_details.is_production){
            require('../server').ioc.push({ server: `localhost:${port}` })
        }
        this.is_port_available(port, (_isavailable) => {
            // IMPORTANT
            // find something to really break the loop when: a port is available && require('../server').package_details.is_production
            if (_isavailable) {
                callback(port);
            }
        });
    }
}