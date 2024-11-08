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
                    require('../db/memory').config.network.ip = require('../utils/socketio').parse_client_ip(socket);  // help to add ip to server config
                    socket.disconnect();
                }
            }
        }

        socket.on('data', (serialized_data) => {
            on_data_common(index = false, serialized_data, send_ack = true, socket);
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
    console.log(`\n\n IOC INIT ${require('../db/memory').db.peers[index].server}\n`)
    
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
                
                if (!index) {
                    if (!require('../db/memory').db.get.peer.exist_uuid(_deserialized.uuid, require('../db/memory').db.peers)) {

                        // to review - to review - to review
                        const _ip_client = require('../utils/socketio').parse_client_ip(socket);
                        if (_ip_client.v6 == '::1' ) { _ip_client.v4 = 'localhost' }
                        // to review - to review - to review
                        
                        require('../db/memory').db.set.peer(require('../db/memory').db.peers.length, _deserialized, `${_ip_client.v4}:${_deserialized.port}`); // ADD PEER
                        init_ioclient(require('../db/memory').db.peers.length-1); // init new io client
                    }
                }
            } else {
                // 'indexing' (part of the handshake) as CLIENT do !
                if (!require('../db/memory').db.get.peer.exist_uuid(_deserialized.uuid, require('../db/memory').db.peers)) {
                    console.log(`\n  => INDEXING HANDSHAKE from server:${_deserialized.uuid}\n`);
                    require('../db/memory').db.set.peer(index, _deserialized); // ADD PEER - ADD PEER - ADD PEER - ADD PEER


                    // when connection done between masters/indexers
                    //   => get list of available peers
                    const _pub = require('../db/memory').db.peers[index].pub; // 
                    const _data = { node: 'get_onlines' };                    // asking every node is maybe not ok
                    require('../db/memory').db.peers[index].socket.emit('data', await serialize(require('../db/memory').db.server.uuid, require('../db/memory').db.server.openpgp, _data, _pub));
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
                require('../db/memory').db.peers[_index].socket.emit('data ack', await serialize(require('../db/memory').db.server.uuid, require('../db/memory').db.server.openpgp, _deserialized.data, _pub));
                // SERVER API
                handle_data(_deserialized, _index, _pub);
                // SERVER API
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


const handle_data = async (deserialized, index, pub) => {
    const { serialize } = require('../../common/network');

    if (deserialized.data.blockchain) {
        switch (deserialized.data.blockchain) {
            case 'new_block':
                console.log(`\n  got new block ${deserialized.data.block.block}\n`);
                require('../db/blockchain').new_block_from_node(deserialized.data);
                break;

            case 'get_firstlast':
                if (deserialized.data.blockchain.firstlast) { // got response
                    // think about something to handle events
                } else { // got ask
                    const _first_block = require('../db/blockchain').blockchain.first().value();
                    const _last_block = require('../db/blockchain').blockchain.last().value();
                    const _data = { blockchain: 'get_firstlast', firstlast: { first: _first_block, last: _last_block } };
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
                    console.log('\n  => GOT ONLINES:');
                    console.log(deserialized.data.onlines);
                    for ( server of deserialized.data.onlines ) { // server is string 'IP:PORT'
                        if (!require('../db/memory').db.get.peer.exist_server(server)) {
                            require('../db/memory').db.peers.push({ server: server });
                            // init ioc
                            init_ioclient(require('../db/memory').db.peers.length-1);
                        }
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