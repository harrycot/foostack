const { io } = require('../server');
const { server_data, get_peer_index_by_uuid } = require('../memory');

/**
 * Socket IO s2s init
 */
exports.init_ioserver = () => {
    io.of('s2s').on('connection', async (socket) => {
        server_data.socket = socket;
        console.log(`ioserver id ${server_data.socket.client.conn.id}: new connection s2s`);

        for (peer of server_data.peers) {
            //console.log(server_data.socket.handshake.headers.host); console.log(sc.server);
            if ((server_data.socket.handshake.headers.host).includes(peer.server)){ // !!host check can fail attention
                if (peer.socket.io.engine.id === server_data.socket.client.conn.id) {
                    // disconnect client
                    console.log(`ioserver id ${server_data.socket.client.conn.id}: self connection detected`);
                    server_data.socket.disconnect();
                }
            }
        }

        server_data.socket.on('data', (serialized_data) => {
            console.log(`ioserver id ${server_data.socket.client.conn.id}: data received`);
            on_data_common(false, serialized_data, true);
        });

        server_data.socket.on('disconnect', () => {
            console.log(`ioserver id ${server_data.socket.client.conn.id}: client disconnected`);
        });
    });

    // init connections as client for each server in require('../server).ioc
    for (num in server_data.peers) {
        init_ioclient(num);
    }
}

const init_ioclient = (num) => {
    const { serialize_s2s } = require('../utils/network');
    server_data.peers[num].socket = require('socket.io-client')('http://' + server_data.peers[num].server + '/s2s');
    
    server_data.peers[num].socket.on('connect', function () {
        console.log(`ioclient id ${server_data.peers[num].socket.io.engine.id}: connected s2s`);
        server_data.peers[num].socket.emit("data", serialize_s2s()); // calling serialize_s2s() without giving data == it's an handshake
    });

    server_data.peers[num].socket.on('data ack', function (serialized_data) {
        console.log(`ioclient id ${server_data.peers[num].socket.io.engine.id}: data ack received`);
        on_data_common(num, serialized_data, false);
    });

    server_data.peers[num].socket.on('disconnect', function () {
        console.log(`ioclient id ${server_data.peers[num].socket.io.engine.id}: server disconnected`);
    });
}

const on_data_common = (num, serialized_data, send_ack) => {
    // num value: false from ios call
    // send_ack value: client is false ; server is true
    const { serialize_s2s, deserialize_s2s } = require('../utils/network');

    const _deserialized_s2s = deserialize_s2s(serialized_data);

    if (!Object.keys(_deserialized_s2s.err).length) { // if no error
        if (!_deserialized_s2s.data){ // handshake
            console.log(`${send_ack ? `ioserver id ${server_data.socket.client.conn.id}` : `ioclient id ${server_data.peers[num].socket.io.engine.id}`}: was an handshake`);
            
            // add peer to require('../memory').server_data.peers
            if ( !require('../memory').is_peer_exist_by_uuid(_deserialized_s2s.uuid) && num ) {
                server_data.peers[num].uuid = _deserialized_s2s.uuid;
                server_data.peers[num].ecdh = _deserialized_s2s.ecdh;
                server_data.peers[num].ecdsa = _deserialized_s2s.ecdsa;
                server_data.peers[num].seen = Date.now();
            }

            // find a way to remove old peer if a node reboot

            if (send_ack) {
                server_data.socket.emit("data ack", serialize_s2s());
            }
        } else { // data
            console.log(`${send_ack ? `ioserver id ${server_data.socket.client.conn.id}` : `ioclient id ${server_data.peers[num].socket.io.engine.id}`}: was data`);
            if (send_ack) {
                server_data.socket.emit("data ack", serialize_s2s(_deserialized_s2s.data, server_data.peers[get_peer_index_by_uuid(_deserialized_s2s.uuid)].ecdh)); // calling serialize_s2s() without giving data == it's an handshake
            }
        }
    } else {
        // HMAC ECDSA
        console.log(_deserialized_s2s.err);
        console.log('WARNING do something..');
    }
}
