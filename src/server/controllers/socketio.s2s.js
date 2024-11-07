exports.init = () => {
    require('../server').io.of('/s2s').on('connection', async (socket) => {
        console.log(`as ioserver got client id ${socket.client.conn.id}: connected`);

        // ITS BETTER IF EVERYONE CAN RUN A NODE
        // // check if client ip is present in peers (ALLOWED) else disconnect and do something
        // if (require('../server').config.is_production) {
        //     const _client_ip = require('../utils/socketio').parse_client_ip(socket);
        //     const _is_client_allowed = this.db.peers.filter(function(peer) { return peer.server.includes(_client_ip.v4) }).length == 0 ? false : true;
        //     if (!_is_client_allowed) {
        //         console.log('CLIENT NOT ALLOWED, DO SOMETHING');
        //         socket.disconnect();
        //     }
        // }

        // if it's a self connection
        for (peer of require('../db/memory').db.peers) {
            if ((socket.handshake.headers.host).includes(peer.server)){ // !!host check can fail attention
                if (peer.socket.io.engine.id === socket.client.conn.id) {
                    console.log(`as ioserver got client id ${socket.client.conn.id}: self connection detected`);
                    require('../server').config.network.ip = require('../utils/socketio').parse_client_ip(socket);  // help to add ip to server config
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
    for (index in require('../db/memory').db.peers) {
        init_ioclient(index);
    }
}

const init_ioclient = (index) => {
    const { serialize } = require('../../common/network');
    require('../db/memory').db.peers[index].socket = require('socket.io-client')('http://' + require('../db/memory').db.peers[index].server + '/s2s');
    
    require('../db/memory').db.peers[index].socket.on('connect', async () => {
        console.log(`as ioclient id ${require('../db/memory').db.peers[index].socket.io.engine.id}: connected`);
        require('../db/memory').db.peers[index].socket.emit('data', await serialize(require('../db/memory').db.server.uuid, require('../db/memory').db.server.openpgp)); // handshake init - handshake init - handshake init - handshake init
    });

    //acting as an index helper
    require('../db/memory').db.peers[index].socket.on('indexing handshake', (serialized_data) => {
        on_data_common(index, serialized_data, send_ack = false);
    });

    require('../db/memory').db.peers[index].socket.on('disconnect', () => {
        console.log(`as ioclient id ${require('../db/memory').db.peers[index].socket.io.engine.id}: disconnected`);
    });
}

const on_data_common = async (index, serialized_data, send_ack) => {
    // index value: false on 'data' handled by server socket
    const { serialize, deserialize } = require('../../common/network');

    const _deserialized = await deserialize(require('../db/memory').db.server.openpgp, serialized_data);

    if (!Object.keys(_deserialized.err).length) {
        if (!_deserialized.data){ // handshake
            if (send_ack) {
                // 'data' (as handshake init)
                console.log(`\n  => HANDSHAKE as server:${require('../db/memory').db.server.uuid} got from client:${_deserialized.uuid}\n`);
                require('../server').io.of('/s2s').emit('indexing handshake', await serialize(require('../db/memory').db.server.uuid, require('../db/memory').db.server.openpgp)); // index helper
            } else {
                // 'indexing' (part of the handshake)
                if (!require('../db/memory').db.get.peer.exist_uuid(_deserialized.uuid, require('../db/memory').db.peers)) {
                    console.log(`\n  => INDEXING HANDSHAKE from server:${_deserialized.uuid}\n`);
                    require('../db/memory').db.set.peer(index, _deserialized); // ADD PEER - ADD PEER - ADD PEER - ADD PEER

                    // when connection done between masters/indexers
                    //   => get list of available peers

                    console.log(index); 
                    const _pub = require('../db/memory').db.peers[index].pub;
                    const _data = { node: 'get_onlines' };
                    require('../db/memory').db.peers[index].socket.emit('data', await serialize(require('../db/memory').db.server.uuid, require('../db/memory').db.server.openpgp, _data, _pub));
                    // trying to deserialize without handshake done

                    // ready to sync with (but minimum of nodes required?)
                    //     require('../db/blockchain').sync_chain();
                }
            }
        } else { // data
            if (send_ack) {
                // 'data'
                console.log(`\n  => DATA as server:${require('../db/memory').db.server.uuid} got from client:${_deserialized.uuid} : ${_deserialized.data}`);
                const _index = require('../db/memory').db.get.peer.index_uuid(_deserialized.uuid, require('../db/memory').db.peers)
                const _pub = require('../db/memory').db.peers[_index].pub;
                if (_deserialized.data.block) {
                    console.log(`\ngot new block ${_deserialized.data.block}\n`);
                    require('../db/blockchain').new_block_from_node(_deserialized.data);
                }
                require('../db/memory').db.peers[_index].socket.emit('data ack', await serialize(require('../db/memory').db.server.uuid, require('../db/memory').db.server.openpgp, _deserialized.data, _pub));
                if (_deserialized.data.blockchain) {
                    switch (_deserialized.data.blockchain) {
                        case 'get_last':
                            const _last_block = require('../db/blockchain').blockchain.last().value();
                            require('../db/memory').db.peers[_index].socket.emit('data ack', await serialize(require('../db/memory').db.server.uuid, require('../db/memory').db.server.openpgp, _last_block, _pub));
                            break;
                    
                        default:
                            break;
                    }
                }
                if (_deserialized.data.node) {
                    switch (_deserialized.data.node) {
                        case 'get_onlines':
                            const _onlines = require('../db/memory').db.get.peer.onlines();
                            console.log('\nONLINES:')
                            console.log(_onlines);
                            break;
                    
                        default:
                            break;
                    }
                }
            } else {
                // 'data ack'
                console.log(`\n  => DATA ACK as server:${require('../db/memory').db.server.uuid} got from client:${_deserialized.uuid} : ${_deserialized.data}`);
                require('../db/memory').db.set.peer(index, _deserialized); // UPDATE PEER - UPDATE PEER - UPDATE PEER - UPDATE PEER
            }
        }
    } else {
        // 
        console.log(_deserialized.err);
        console.log('WARNING do something..');
    }
}
