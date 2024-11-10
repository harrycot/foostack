// socket Obect SERVER SIDE !
exports.parse_client_ip = (socket) => {
    return { v4: '127.0.0.1', v6: '::1' } // review parse_client_ip

    // const sha_last_index_colon = socket.handshake.address.lastIndexOf(':');
    // if (sha_last_index_colon > -1) {
    //     if (socket.handshake.address.lastIndexOf('.') > -1) {
    //         return {
    //             v4: socket.handshake.address.slice(sha_last_index_colon + 1),
    //             v6: socket.handshake.address.slice(0, sha_last_index_colon)
    //         }
    //     } else { 
    //         return { v4: false, v6: socket.handshake.address }
    //     }
    // } else {
    //     return { v4: socket.handshake.address, v6: false }
    // }
}
