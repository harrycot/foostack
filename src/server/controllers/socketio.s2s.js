exports.init = () => {
    require('../server').io.of('/s2s').on('connection', async (socket) => {
        console.log(`as ioserver got client id ${socket.client.conn.id}: connected`);

        socket.on('data', (serialized_data) => {
            on_data_common(index = false, serialized_data, send_ack = true, socket);
        });
        socket.on('data ack', (serialized_data) => {
            on_data_common(index = false, serialized_data, send_ack = false);
        });
        socket.on('disconnect', () => {
            console.log(`as ioserver got client id ${socket.client.conn.id}: disconnected`);

            // remove peer where sid from peers (disconnecting client before)
            const _peer_index = require('../db/memory').db.get.peer.index_sid(socket.client.conn.id, require('../db/memory').db.peers);
            //dont remove default peers
            if (_peer_index >= 0) { // if this peer is not present in default_peers
                if ( require('../db/memory').db.default_peers.filter((el) => { return el.server === require('../db/memory').db.peers[_peer_index].server }).length == 0 ) {
                    if (require('../db/memory').db.peers[index].socket.connected) {
                        require('../db/memory').db.peers[index].socket.disconnect();
                    }
                    require('../db/memory').db.del.peer(_peer_index);
                }
            }
            console.log(require('../db/memory').db.peers.length);
        });
        // if it's a self connection
        //   => disconnect and remove
        for (let index = 0; index < require('../db/memory').db.peers.length; index++) {
            if ((socket.handshake.headers.host).includes(require('../db/memory').db.peers[index].server)){ // !!host check can fail attention
                if (require('../db/memory').db.peers[index].socket.io.engine.id === socket.client.conn.id) {
                    console.log(`as ioserver got client id ${socket.client.conn.id}: self connection detected`);
                    require('../db/memory').db.peers[index].socket.disconnect();
                    require('../db/memory').db.del.peer(index);
                    break;
                }
            }
        }
    });
    // init connections as client for each server in peers
    for (index in require('../db/memory').db.peers) {
        init_ioclient(index);
    }
}

const init_ioclient = (index) => {
    console.log(`\n  IOC INIT ${require('../db/memory').db.peers[index].server}\n`)
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

const on_data_common = async (index, serialized_data, send_ack, socket) => {
    // index value: false on 'data' handled by server socket
    const { serialize, deserialize } = require('../../common/network');
    const _deserialized = await deserialize(require('../db/memory').db.server.openpgp, serialized_data);
    if (!_deserialized) { console.log('\n  => data received without handshake done: ignore\n'); return; }

    if (!Object.keys(_deserialized.err).length) {
        if (!_deserialized.data){ // handshake
            if (send_ack) {
                // 'data' (as handshake init) as SERVER do !
                console.log(`\n  => HANDSHAKE as server:${require('../db/memory').db.server.uuid} got from client:${_deserialized.uuid}\n`);
                require('../server').io.of('/s2s').emit('indexing handshake', await serialize(require('../db/memory').db.server.uuid, require('../db/memory').db.server.openpgp)); // index helper
                
                
                // to review - to review - to review
                const _ip_client = require('../utils/socketio').parse_client_ip(socket);
                if (_ip_client.v6 == '::1' ) { _ip_client.v4 = '127.0.0.1' }
                _ip_client.v4 = '127.0.0.1';
                // to review - to review - to review


                _deserialized.server = `${_ip_client.v4}:${_deserialized.port}`;
                _deserialized.sid = socket.client.conn.id;
                if (!require('../db/memory').db.get.peer.exist_server(_deserialized.server)) {
                    require('../db/memory').db.set.peer(require('../db/memory').db.peers.length, _deserialized); // ADD PEER
                    init_ioclient(require('../db/memory').db.peers.length-1); // init new io client
                } else { // update peer with sid (init_ioclient called from get_onlines)
                    const _index = require('../db/memory').db.get.peer.index_server(_deserialized.server);
                    require('../db/memory').db.set.peer(_index, _deserialized); // UPDATE PEER
                }
            } else {
                // 'indexing' (part of the handshake) as CLIENT do !
                if (!require('../db/memory').db.get.peer.exist_uuid(_deserialized.uuid, require('../db/memory').db.peers)) {
                    console.log(`\n  => INDEXING HANDSHAKE from server:${_deserialized.uuid}\n`);
                    // as client set peer (got server emit) (no client sid available) => uuid
                    require('../db/memory').db.set.peer(index, _deserialized); // ADD PEER - ADD PEER - ADD PEER - ADD PEER
                    //   => get list of available peers
                    const _pub = require('../db/memory').db.peers[index].pub;
                    const _data = { node: 'get_onlines' };
                    require('../db/memory').db.peers[index].socket.emit('data', await serialize(require('../db/memory').db.server.uuid, require('../db/memory').db.server.openpgp, _data, _pub));
                }
            }
        } else { // data
            if (send_ack) {
                // 'data'
                console.log(`\n  => DATA as server:${require('../db/memory').db.server.uuid} got from client:${_deserialized.uuid} :`);
                console.log(_deserialized.data);
                const _index = require('../db/memory').db.get.peer.index_uuid(_deserialized.uuid, require('../db/memory').db.peers)
                const _pub = require('../db/memory').db.peers[_index].pub;
                require('../db/memory').db.peers[_index].socket.emit('data ack', await serialize(require('../db/memory').db.server.uuid, require('../db/memory').db.server.openpgp, _deserialized.data, _pub));
                // SERVER API
                handle_data(_deserialized, _index, _pub);
                // SERVER API
                require('../db/memory').db.set.peer(_index, _deserialized); // UPDATE PEER - UPDATE PEER - UPDATE PEER - UPDATE PEER
            } else {
                // 'data ack'
                console.log(`\n  => DATA ACK as server:${require('../db/memory').db.server.uuid} got from client:${_deserialized.uuid} :`);
                console.log(_deserialized.data);
            }
        }
    } else {
        // 
        console.log(_deserialized.err);
        console.log('WARNING do something..');
    }
}


const handle_data = async (deserialized, index, pub) => {
    const { serialize } = require('../../common/network');

    if (deserialized.data.blockchain) {
        switch (deserialized.data.blockchain) {
            case 'new_block':
                console.log(`\n  got new block ${deserialized.data.block.block}\n`);
                require('../db/blockchain').new_block_from_node(deserialized.data);
                break;
            case 'get_firstlast':
                if (deserialized.data.first_last) { // got response
                    // think about something to handle events
                    if (deserialized.data.callback) {
                        switch (deserialized.data.callback) {
                            case 'sync_chain':
                                const _callback_data = { blockchain: 'get_firstlast', first_last: deserialized.data.first_last, server: require('../db/memory').db.peers[index].server };
                                require('../db/blockchain').sync_chain(_callback_data);
                                break;
                            default:
                                break;
                        }
                    }
                } else { // got ask
                    const _first_block = require('../db/blockchain').blockchain.first().value();
                    const _last_block = require('../db/blockchain').blockchain.last().value();
                    const _data = { blockchain: 'get_firstlast', first_last: { first: _first_block, last: _last_block } };
                    if (deserialized.data.callback) { _data.callback = deserialized.data.callback }
                    require('../db/memory').db.peers[index].socket.emit('data', await serialize(require('../db/memory').db.server.uuid, require('../db/memory').db.server.openpgp, _data, pub));
                }
                break;
            default:
                break;
        }
    }
    if (deserialized.data.node) {
        switch (deserialized.data.node) {
            case 'get_onlines':
                if (deserialized.data.onlines) { // got response
                    for ( server of deserialized.data.onlines ) { // server is string 'IP:PORT'
                        if (!require('../db/memory').db.get.peer.exist_server(server)) {
                            require('../db/memory').db.peers.push({ server: server });
                            // init ioc
                            init_ioclient(require('../db/memory').db.peers.length-1);
                        }
                    }

                    // if onlines done
                    const _onlines = require('../db/memory').db.get.peer.onlines();
                    if ( (_onlines.length == require('../db/memory').db.peers.length) && !require('../db/memory').db.state.got_online_peers ) {
                        require('../db/memory').db.state.got_online_peers = true;
                        // init blockchain sync
                        require('../db/blockchain').sync_chain();
                    }
                } else { // got ask
                    const _onlines = require('../db/memory').db.get.peer.onlines();
                    const _data = { node: 'get_onlines', onlines: _onlines }
                    require('../db/memory').db.peers[index].socket.emit('data', await serialize(require('../db/memory').db.server.uuid, require('../db/memory').db.server.openpgp, _data, pub));
                }
                break;
            default:
                break;
        }
    }
}