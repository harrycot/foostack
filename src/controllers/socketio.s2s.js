const { io, ioc, ios } = require('../server');
//const { io: ios } = require('../memory').server_data;

/**
 * Socket IO s2s init
 */
exports.init_ios = () => {
    io.of('s2s').on('connection', async (socket) => {
        //const _num = get_ios_index(socket);
        ios.socket = socket;
        console.log(`ioserver id ${ios.socket.client.conn.id}: new connection s2s`);

        for (sc of ioc) {
            //console.log(ios.socket.handshake.headers.host); console.log(sc.server);
            if ((ios.socket.handshake.headers.host).includes(sc.server)){ // !!host check can fail attention
                if (sc.socket.io.engine.id === ios.socket.client.conn.id) {
                    // disconnect client
                    console.log(`ioserver id ${ios.socket.client.conn.id}: self connection detected`);
                    ios.socket.disconnect();
                }
            }
        }

        ios.socket.on('data', (serialized_data) => {
            console.log(`ioserver id ${ios.socket.client.conn.id}: data received`);
            on_data_common(false, serialized_data, true);
        });

        ios.socket.on('disconnect', () => {
            console.log(`ioserver id ${ios.socket.client.conn.id}: client disconnected`);
        });
    });

    // init connections as client for each server in require('../server).ioc
    for (const snc in ioc) {
        init_ioc(snc);
    }
}

const init_ioc = (num) => {
    const { serialize_s2s } = require('../utils/network');
    ioc[num].socket = require('socket.io-client')('http://' + ioc[num].server + '/s2s');
    

    ioc[num].socket.on('connect', function () {
        ioc[num].s2s_server = ioc[num].server;
        console.log(`ioclient id ${ioc[num].socket.io.engine.id}: connected s2s`);

        ioc[num].socket.emit("data", serialize_s2s()); // calling serialize_s2s() without giving data == it's an handshake
    });

    ioc[num].socket.on('data ack', function (serialized_data) {
        console.log(`ioclient id ${ioc[num].socket.io.engine.id}: data ack received`);
        on_data_common(num, serialized_data, false);
    });

    ioc[num].socket.on('disconnect', function () {
        console.log(`ioclient id ${ioc[num].socket.io.engine.id}: server disconnected`);
    });
}

const on_data_common = (num, serialized_data, send_ack) => {
    // num value: false from ios call
    // send_ack value: client is false ; server is true
    const { serialize_s2s, deserialize_s2s } = require('../utils/network');

    const _deserialized_s2s = deserialize_s2s(serialized_data);

    if (!Object.keys(_deserialized_s2s.err).length) { // if no error
        if (!_deserialized_s2s.data){ // handshake
            console.log(`${send_ack ? `ioserver id ${ios.socket.client.conn.id}` : `ioclient id ${ioc[num].socket.io.engine.id}`}: was an handshake`);
            
            // add peer to require('../memory').server_data.peers
            if ( !require('../memory').is_peer_exist_by_uuid(_deserialized_s2s.uuid) ) {
                require('../memory').server_data.peers.push( { uuid: _deserialized_s2s.uuid,
                    ecdh: _deserialized_s2s.ecdh, ecdsa: _deserialized_s2s.ecdsa, seen: Date.now() } );
            }

            //console.log(require('../memory').server_data);
            //console.log(ios);
            // find a way to remove old peer if a node reboot

            if (send_ack) {
                // ioS
                ios.socket.emit("data ack", serialize_s2s());
                ios.s2s_uuid = _deserialized_s2s.uuid;
                ios.s2s_ecdh = _deserialized_s2s.ecdh;
                ios.s2s_ecdsa = _deserialized_s2s.ecdsa;
            } else {
                // ioC
                ioc[num].s2s_uuid = _deserialized_s2s.uuid;
                ioc[num].s2s_ecdh = _deserialized_s2s.ecdh;
                ioc[num].s2s_ecdsa = _deserialized_s2s.ecdsa;
            }
        } else { // data
            console.log(`${send_ack ? `ioserver id ${ios.socket.client.conn.id}` : `ioclient id ${ioc[num].socket.io.engine.id}`}: was data`);
            if (send_ack) {
                ios.socket.emit("data ack", serialize_s2s(_deserialized_s2s.data, ios.s2s_ecdh));
            }
        }
    } else {
        // HMAC ECDSA
        console.log(_deserialized_s2s.err);
        console.log('WARNING do something..');
    }
}
