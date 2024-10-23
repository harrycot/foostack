/**
 * Socket IO s2s init
 */
exports.init_ioserver = () => {
    require('../server').io.of('s2s').on('connection', async (socket) => {
        require('../memory').db.server.socket = socket;
        console.log(`ioserver id ${require('../memory').db.server.socket.client.conn.id}: new connection s2s`);

        for (peer of require('../memory').db.peers) {
            if ((require('../memory').db.server.socket.handshake.headers.host).includes(peer.server)){ // !!host check can fail attention
                if (peer.socket.io.engine.id === require('../memory').db.server.socket.client.conn.id) {
                    // disconnect client
                    console.log(`ioserver id ${require('../memory').db.server.socket.client.conn.id}: self connection detected`);
                    require('../memory').db.server.socket.disconnect();
                }
            }
        }

        require('../memory').db.server.socket.on('data', (serialized_data) => {
            console.log(`ioserver id ${require('../memory').db.server.socket.client.conn.id}: data received`);
            on_data_common(false, serialized_data, true);
        });

        require('../memory').db.server.socket.on('disconnect', () => {
            console.log(`ioserver id ${require('../memory').db.server.socket.client.conn.id}: client disconnected`);
        });
    });

    // init connections as client for each server in peers
    for (index in require('../memory').db.peers) {
        init_ioclient(index);
    }
}

const init_ioclient = (index) => {
    const { serialize_s2s } = require('../utils/network');
    require('../memory').db.peers[index].socket = require('socket.io-client')('http://' + require('../memory').db.peers[index].server + '/s2s');
    
    require('../memory').db.peers[index].socket.on('connect', function () {
        console.log(`ioclient id ${require('../memory').db.peers[index].socket.io.engine.id}: connected s2s`);
        require('../memory').db.peers[index].socket.emit('data', serialize_s2s()); // calling serialize_s2s() without giving data == it's an handshake
    });

    require('../memory').db.peers[index].socket.on('data ack', function (serialized_data) {
        console.log(`ioclient id ${require('../memory').db.peers[index].socket.io.engine.id}: data ack received`);
        on_data_common(index, serialized_data, false);
    });

    require('../memory').db.peers[index].socket.on('disconnect', function () {
        console.log(`ioclient id ${require('../memory').db.peers[index].socket.io.engine.id}: server disconnected`);
    });
}

const on_data_common = (index, serialized_data, send_ack) => {
    // index value: false on 'data' handled by server socket
    // send_ack value: client is false ; server is true
    const { serialize_s2s, deserialize_s2s } = require('../utils/network');

    const _deserialized_s2s = deserialize_s2s(serialized_data);

    if (!Object.keys(_deserialized_s2s.err).length) { // if no error
        if (!_deserialized_s2s.data){ // handshake
            console.log(`${send_ack ? `ioserver id ${require('../memory').db.server.socket.client.conn.id}` : `ioclient id ${require('../memory').db.peers[index].socket.io.engine.id}`}: was an handshake`);
            
            // ADD UPDATE PEER to array
            require('../memory').db.set.peer(index, _deserialized_s2s);

            // if (index) {
            //     console.log(`GOT DATA ACK iam ${require('../memory').db.peers[index].uuid}`);
            // }
            // find a way to remove old peer if a node reboot
            //console.log(require('../memory').db.peers);

            if (send_ack) {
                require('../memory').db.server.socket.emit('data ack', serialize_s2s());
            }
        } else { // data
            console.log(`${send_ack ? `ioserver id ${require('../memory').db.server.socket.client.conn.id}` : `ioclient id ${require('../memory').db.peers[index].socket.io.engine.id}`}: was data`);
            if (send_ack) {
                //console.log(`SEND DATA ACK iam ${require('../memory').db.server.uuid}`);
                //const _ecdh = require('../memory').db.peers[require('../memory').db.get.peer.index(_deserialized_s2s.uuid)].ecdh;
                //console.log(_ecdh);
                //require('../memory').db.server.socket.emit('data ack', serialize_s2s(_deserialized_s2s.data, _ecdh)); // calling serialize_s2s() without giving data == it's an handshake
            }

            console.log(require('../memory').config);console.log(require('../memory').db);

        }
    } else {
        // HMAC ECDSA
        console.log(_deserialized_s2s.err);
        console.log('WARNING do something..');
    }
}
