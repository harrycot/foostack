exports.init_ioserver = () => {
    require('../server').io.of('/s2s').on('connection', async (socket) => {
        console.log(`as ioserver got client id ${socket.client.conn.id}: connected`);

        // check if client ip is present in peers (ALLOWED) else disconnect and do something
        if (require('../memory').config.is_production) {
            const client_ip = require('../utils/socketio').parse_client_ip(socket);
            const is_client_allowed = this.db.peers.filter(function(peer) { return peer.server.includes(client_ip.v4) }).length == 0 ? false : true;
            if (!is_client_allowed) {
                console.log('CLIENT NOT ALLOWED, DO SOMETHING');
                socket.disconnect();
            }
        }

        // if it's a self connection
        for (peer of require('../memory').db.peers) {
            if ((socket.handshake.headers.host).includes(peer.server)){ // !!host check can fail attention
                if (peer.socket.io.engine.id === socket.client.conn.id) {
                    console.log(`as ioserver got client id ${socket.client.conn.id}: self connection detected`);
                    const client_ip = require('../utils/socketio').parse_client_ip(socket);
                    require('../memory').config.network.ip = client_ip; // help to add ip to server config
                    socket.disconnect();
                }
            }
        }

        socket.on('data', (serialized_data) => {
            on_data_common(index = false, serialized_data, send_ack = true);
        });

        socket.on('data ack', (serialized_data) => {
            on_data_common(index = false, serialized_data, send_ack = false);
        });

        socket.on('disconnect', () => {
            console.log(`as ioserver got client id ${socket.client.conn.id}: disconnected`);
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
    
    require('../memory').db.peers[index].socket.on('connect', async () => {
        console.log(`as ioclient id ${require('../memory').db.peers[index].socket.io.engine.id}: connected`);
        require('../memory').db.peers[index].socket.emit('data', await serialize_s2s()); // handshake init - handshake init - handshake init - handshake init
    });

    //acting as an index helper
    require('../memory').db.peers[index].socket.on('indexing handshake', (serialized_data) => {
        on_data_common(index, serialized_data, send_ack = false);
    });

    require('../memory').db.peers[index].socket.on('disconnect', () => {
        console.log(`as ioclient id ${require('../memory').db.peers[index].socket.io.engine.id}: disconnected`);
    });
}

const on_data_common = async (index, serialized_data, send_ack) => {
    // index value: false on 'data' handled by server socket
    const { serialize_s2s, deserialize_s2s } = require('../utils/network');

    const _deserialized_s2s = await deserialize_s2s(serialized_data);

    if (!Object.keys(_deserialized_s2s.err).length) {
        if (!_deserialized_s2s.data){ // handshake
            if (send_ack) {
                // 'data' (as handshake init)
                console.log(`\n  => HANDSHAKE as server:${require('../memory').db.server.uuid} got from client:${_deserialized_s2s.uuid}\n`);
                require('../server').io.of('/s2s').emit('indexing handshake', await serialize_s2s()); // index helper
            } else {
                // 'indexing' (part of the handshake)
                if (!require('../memory').db.get.peer.exist(_deserialized_s2s.uuid)) {
                    console.log(`\n  => INDEXING HANDSHAKE from server:${_deserialized_s2s.uuid}\n`);
                    require('../memory').db.set.peer(index, _deserialized_s2s); // ADD PEER - ADD PEER - ADD PEER - ADD PEER
                }
            }
        } else { // data
            if (send_ack) {
                // 'data'
                console.log(`\n  => DATA as server:${require('../memory').db.server.uuid} got from client:${_deserialized_s2s.uuid} : ${_deserialized_s2s.data}`);
                const _index = require('../memory').db.get.peer.index(_deserialized_s2s.uuid)
                const _openpgp = require('../memory').db.peers[_index].openpgp;
                require('../memory').db.peers[_index].socket.emit('data ack', await serialize_s2s(_deserialized_s2s.data, _openpgp));

            } else {
                // 'data ack'
                console.log(`\n  => DATA ACK as server:${require('../memory').db.server.uuid} got from client:${_deserialized_s2s.uuid} : ${_deserialized_s2s.data}`);
                require('../memory').db.set.peer(index, _deserialized_s2s); // UPDATE PEER - UPDATE PEER - UPDATE PEER - UPDATE PEER
            }
        }
    } else {
        // 
        console.log(_deserialized_s2s.err);
        console.log('WARNING do something..');
    }
}
