const { io, ioc, ios } = require('../server');

/**
 * Socket IO s2s init
 */
exports.init_ios = () => {
    io.of('s2s').on('connection', async (socket) => {
        console.log("server: new connection s2s");
        const sns = get_ios_index(socket);

        ios[sns].socket.on('handshake', (data) => {
            console.log('server: handshake received');
            on_hanshake_common(sns, data, true);
        });

        ios[sns].socket.on('disconnect', () => {
            console.log('server: client disconnected');
        });
    });

    for (const snc in ioc) {
        const { app } = require('../server');
        if (!ioc[snc].server.includes(app.get('port'))) {
            init_ioc(snc);
        }
    }
}

const get_ios_index = (socket) => {
    let sns;
    let is_new_client = true;

    for (const num in ios) {
        if (ios[num].client === socket.handshake.address) {
            ios[num].socket = socket;
            is_new_client = false;
            sns = num;
        }
    }
    if (is_new_client) {
        sns = ios.length;
        ios[ios.length] = {
            client: socket.handshake.address,
            socket: socket
        }
    }
    return sns;
}

const init_ioc = (num) => {
    const { serialize_handshake_s2s } = require('../server').util.network;
    ioc[num].socket = require('socket.io-client')('http://' + ioc[num].server + '/s2s');


    ioc[num].socket.on('connect', function () {
        ioc[num].socket.s2s_server = ioc[num].server;
        console.log('client: connected s2s');

        ioc[num].socket.emit("handshake", serialize_handshake_s2s());
    });

    ioc[num].socket.on('handshake ack', function (data) {
        console.log('client: handshake ack received');
        on_hanshake_common(num, data, false);
    });

    ioc[num].socket.on('disconnect', function () {
        console.log('client: server disconnected');
    });
}

const on_hanshake_common = (num, data, send_ack) => {

    const { serialize_handshake_s2s, deserialize_handshake_s2s } = require('../server').util.network;

    const deserialized_hanshake_s2s = deserialize_handshake_s2s(data);

    if (!Object.keys(deserialized_hanshake_s2s.err).length) {

        update_db_peers_common(deserialized_hanshake_s2s);

        if (send_ack) {
            ios[num].socket.emit("handshake ack", serialize_handshake_s2s());

            ios[num].socket.s2s_uuid = deserialized_hanshake_s2s.uuid;
            ios[num].socket.s2s_ecdh = deserialized_hanshake_s2s.ecdh;
            ios[num].socket.s2s_ecdsa = deserialized_hanshake_s2s.ecdsa;
        } else {
            ioc[num].socket.s2s_uuid = deserialized_hanshake_s2s.uuid;
            ioc[num].socket.s2s_ecdh = deserialized_hanshake_s2s.ecdh;
            ioc[num].socket.s2s_ecdsa = deserialized_hanshake_s2s.ecdsa;
        }
    } else {
        // HMAC
        console.log(deserialized_hanshake_s2s.err);
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