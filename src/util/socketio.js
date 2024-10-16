
// socket Obect SERVER SIDE !
exports.parse_client_ip = (socket) => {
    let s2s_client = {};
    const sha_last_index_colon = socket.handshake.address.lastIndexOf(':');
    if (sha_last_index_colon > -1) {
        if (socket.handshake.address.lastIndexOf('.') > -1) {
            s2s_client.ipv4 = socket.handshake.address.slice(sha_last_index_colon + 1);
            s2s_client.ipv6 = socket.handshake.address.slice(0, sha_last_index_colon);
        } else {
            s2s_client.ipv6 = socket.handshake.address;
        }
    } else {
        s2s_client.ipv4 = socket.handshake.address;
    }
    return s2s_client;
}