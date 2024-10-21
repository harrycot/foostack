

exports.is_production = process.pkg ? true : false;
exports.allowed_port_range = process.pkg ? { start: 443, end: 443} : { start: 8001, end: 8010 };
exports.network_details = { port: false }
//exports.