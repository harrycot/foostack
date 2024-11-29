// where address is socket.handshake.address
exports.parse_client_ip = (address) => {
    const sha_last_index_colon = address.lastIndexOf(':');
    if (sha_last_index_colon > -1) {
        if (address.lastIndexOf('.') > -1) {
            return {
                v4: address.slice(sha_last_index_colon + 1),
                v6: address.slice(0, sha_last_index_colon)
            }
        } else { 
            return { v4: false, v6: address }
        }
    } else {
        return { v4: address, v6: false }
    }
}
