
exports.serialize_s2s = (data) => {
    const { uuid, ecdsa, ecdh, hmac } = require('../server').util.crypto;

    const _data = data ? Buffer.from(data).toString('base64') : '';
    const _data_signature = Buffer.from(ecdsa.sign(_data)).toString('base64');
    const _uuid = Buffer.from(uuid.get()).toString('base64');
    const _uuid_signature = Buffer.from(ecdsa.sign(_uuid)).toString('base64');

    const _ecdsa = ecdsa.local.get.public.string();
    const _ecdh = ecdh.local.get.public.string();

    // _prefinal is different if it's for handshake or data
    const _prefinal = data ? [_data, _data_signature, _uuid, _uuid_signature].join(':') : [_uuid, _uuid_signature, _ecdsa, _ecdh].join(':');
    const _hmac = hmac.get.base64(_prefinal);

    const _final = [_prefinal, _hmac].join(':');

    return Buffer.from(_final).toString('base64');
}

exports.deserialize_s2s = (serialized_data) => {
    const { hmac, ecdsa } = require('../server').util.crypto;

    const _table = Buffer.from(serialized_data, 'base64').toString().split(':');
    const _hmac_to_compute = [_table[0], _table[1], _table[2], _table[3]].join(':');

    // if it's an uuid at _table[0] => it's an handshake ; else it's data without ecdsa & ecdh
    const _json_data = require('uuid').validate(Buffer.from(_table[0], 'base64').toString()) ? {
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
    //console.log(_json_data);

    // perform hmac and ecdsa check
    if (hmac.get.base64(_hmac_to_compute) !== _json_data.hmac) {
        _json_data.err.hmac = "hmac does not match";
    }
    if (_json_data.data) {
        const { s2s: db } = require('../server').db;
        const _ecdsa = db.get('peers').find({ uuid: _json_data.uuid }).value().ecdsa;

        if (ecdsa.verify(_json_data.data, ecdsa.build.public(_ecdsa), _json_data.data_signature)) {
            _json_data.err.ecdsa_data = "data ecdsa signature error";
        }
        if (ecdsa.verify(_json_data.uuid, ecdsa.build.public(_ecdsa), _json_data.uuid_signature)) {
            _json_data.err.ecdsa_uuid = "uuid ecdsa signature error";
        }
        console.log(`DATA received: ${_json_data.data}`);
    } else {
        if (ecdsa.verify(_json_data.uuid, ecdsa.build.public(_json_data.ecdsa), _json_data.uuid_signature)) {
            _json_data.err.ecdsa_uuid = "uuid ecdsa signature error";
        }
    }
    
    return _json_data;
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