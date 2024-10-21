const { io, ioc, ios } = require('../server');

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

// not used
const get_ios_index = (socket) => {
    let _index;
    let _is_new_client = true;

    // console.log(socket.handshake);
    // TODO: check if socket.handshake.address return the good client address
    for (const num in ios) {
        if (ios.client === socket.handshake.address) {
            ios.socket = socket;
            _is_new_client = false;
            _index = num;
        }
    }
    if (_is_new_client) {
        _index = ios.length;
        ios[ios.length] = {
            client: socket.handshake.address,
            socket: socket
        }
    }
    return _index;
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
            update_db_peers_common(_deserialized_s2s);
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
            //update_db_peers_common(_deserialized_s2s);
            if (send_ack) {
                // ioS
                ios.socket.emit("data ack", serialize_s2s(_deserialized_s2s.data, ios.s2s_ecdh));
                //ios.s2s_uuid = _deserialized_s2s.uuid;
                //ios.s2s_ecdh = _deserialized_s2s.ecdh;
                //ios.s2s_ecdsa = _deserialized_s2s.ecdsa;
            } else {
                // ioC
                //ioc[num].s2s_uuid = _deserialized_s2s.uuid;
                //ioc[num].s2s_ecdh = _deserialized_s2s.ecdh;
                //ioc[num].s2s_ecdsa = _deserialized_s2s.ecdsa;
            }
        }
        
    } else {
        // HMAC ECDSA
        console.log(_deserialized_s2s.err);
        console.log('WARNING do something..');
    }
}

const update_db_peers_common = (data) => {
    const { s2s: db } = require('../server').db;

    if (!db.get('peers').find({ uuid: data.uuid }).value()) {
        db.get('peers')
            .push({ uuid: data.uuid })
            .write();

        if (!db.get('peers').find({ uuid: data.uuid }).value().ecdh) {
            db.get('peers')
                .find({ uuid: data.uuid })
                .assign({ ecdh: data.ecdh })
                .write();
        }

        if (!db.get('peers').find({ uuid: data.uuid }).value().ecdsa) {
            db.get('peers')
                .find({ uuid: data.uuid })
                .assign({ ecdsa: data.ecdsa })
                .write();
        }
    }

    db.get('peers')
        .find({ uuid: data.uuid })
        .assign({ seen: Date.now() })
        .write()

}