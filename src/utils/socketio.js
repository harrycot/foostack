// socket Obect SERVER SIDE !
exports.parse_client_ip = (socket) => {
    const sha_last_index_colon = socket.handshake.address.lastIndexOf(':');
    if (sha_last_index_colon > -1) {
        if (socket.handshake.address.lastIndexOf('.') > -1) {
            return {
                ipv4: socket.handshake.address.slice(sha_last_index_colon + 1),
                ipv6: socket.handshake.address.slice(0, sha_last_index_colon)
            }
        } else {
            return { ipv4: false, ipv6: socket.handshake.address }
        }
    } else {
        return { ipv4: socket.handshake.address, ipv6: false }
    }
}
