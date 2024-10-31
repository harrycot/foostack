exports.on_data_common = async (index, serialized_data, send_ack) => {
    // index value: false on 'data' handled by server socket
    const { serialize_s2s, deserialize_s2s } = require('../utils/network');

    const _deserialized_s2s = await deserialize_s2s(serialized_data);

    if (!Object.keys(_deserialized_s2s.err).length) {
        if ( (!deserialize_s2s.data && !send_ack) || _deserialized_s2s.data ) { // if it's everything else handshake init
            // ADD UPDATE PEER to array
            // an index is necessary to know which uuid become with wich host
            require('../memory').db.set.peer(index, _deserialized_s2s);
        }

        if (!_deserialized_s2s.data){ // handshake            
            if (send_ack) {
                // 'data' (as handshake init)
                console.log(`\n  => HANDSHAKE as server:${require('../memory').db.server.uuid} got from client:${_deserialized_s2s.uuid}\n`);
                require('../memory').db.server.socket.emit('indexing handshake multicast', await serialize_s2s()); // index helper
            } else {
                // 'indexing' (part of the handshake) require('../memory').db.set.peer(index, _deserialized_s2s)
                console.log(`\n  => INDEXING HANDSHAKE MULTICAST uuid:${_deserialized_s2s.uuid}\n`);
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
            }
        }
    } else {
        // 
        console.log(_deserialized_s2s.err);
        console.log('WARNING do something..');
    }
}