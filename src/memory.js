

exports.is_production = process.pkg ? true : false;
exports.allowed_port_range = process.pkg ? { start: 443, end: 443} : { start: 8001, end: 8010 };
exports.network_details = { ip4: false, ip6: false, port: false };

exports.server_data = { uuid: false, keys: { ecdsa: false, ecdh: false }, peers: [], io: false };

exports.is_peer_exist_by_uuid = (uuid) => {
    return this.server_data.peers.filter(function(peer) { return peer.uuid === uuid }).length == 0 ? false : true;
}
exports.get_peer_index_by_uuid = (uuid) => {
    for (index in peers) {
        if (this.server_data.peers[index].uuid == uuid) { return index }
    }
}