

exports.is_production = process.pkg ? true : false;
exports.allowed_port_range = process.pkg ? { start: 443, end: 443} : { start: 8001, end: 8010 };
exports.network_details = { ip4: false, ip6: false, port: false };

exports.server_data = { uuid: false, keys: { ecdsa: false, ecdh: false }, peers: [] };
