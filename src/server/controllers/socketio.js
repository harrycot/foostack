const { serialize, deserialize } = require('../../common/network');

exports.init = () => {
    // think about a channel to update web clients
    require('../server').io.of('/web').on('connection', async (socket) => {
        console.log(`web: as ioserver got client id ${socket.client.conn.id}: connected`);


        const cookie = require('cookie');
        // handle cookie to handle login
        require('../server').io.engine.on("headers", (headers, request) => {
            if (!request.headers.cookie) return;
            const cookies = cookie.parse(request.headers.cookie);
            //console.log(cookies);
            if (!cookies.uuid) {
                headers["set-cookie"] = cookie.serialize("uuid", "abc", { maxAge: 86400 });
            }
        });
        

        socket.on('data', async (serialized_data) => {
            try {
                const _deserialized = await deserialize(require('../db/memory').db.server.openpgp, serialized_data);
                if (_deserialized.pub) {
                    console.log(`web: as ioserver got client id ${socket.client.conn.id}: handshake`);
                    require('../db/memory').db.set.webpeer(_deserialized, socket.client.conn.id); // ADD PEER - ADD PEER - ADD PEER - ADD PEER
                    socket.emit('data ack', await serialize(require('../db/memory').db.server.uuid, require('../db/memory').db.server.openpgp));
                } else {
                    console.log(`web: as ioserver got client id ${socket.client.conn.id}: data`);
                    require('../db/memory').db.set.webpeer(_deserialized, socket.client.conn.id); // UPDATE PEER - UPDATE PEER - UPDATE PEER - UPDATE PEER
                    const _index = require('../db/memory').db.get.peer.index_uuid(_deserialized.uuid, require('../db/memory').db.webpeers);
                    //socket.emit('data ack', await serialize(require('../db/memory').db.server.uuid, require('../db/memory').db.server.openpgp, _deserialized.data, require('../db/memory').db.webpeers[_index].pub));
                    // end of ack
                    const _json_data = JSON.parse(_deserialized.data);
                    console.log(_json_data);
                    if (_json_data.ask_login_data) {
                        const _login_data = require('../utils/crypto').misc.generate.seed(50,100);
                        require('../db/memory').db.webpeers[_index].login_data = _login_data;
                        socket.emit('data', await serialize(require('../db/memory').db.server.uuid, require('../db/memory').db.server.openpgp, { login_data_seed: _login_data.seed }, require('../db/memory').db.webpeers[_index].pub));
                    } else if (_json_data.login_data_signed) {
                        const openpgp = require('openpgp');
                        const _signed = await openpgp.readCleartextMessage({ cleartextMessage: Buffer.from(_json_data.login_data_signed, 'base64').toString() });
                        const _json_login_data_signed = JSON.parse(_signed.text); _json_login_data_signed.err = {};
                        const _json_data_openpgp_pub_obj = await openpgp.readKey({ armoredKey: Buffer.from(_json_login_data_signed.pub, 'base64').toString() });
                        const _verify_result_clear = await openpgp.verify({ message: _signed, verificationKeys: _json_data_openpgp_pub_obj });
                        try { await _verify_result_clear.signatures[0].verified } catch (e) { _json_login_data_signed.err.signature_clear = `clear: Signature could not be verified: ${e.message}` }
                        if (!Object.keys(_json_login_data_signed.err).length) {
                            console.log(_json_login_data_signed.login_data_seed);
                            console.log(require('../db/memory').db.webpeers[_index].login_data);
                            
                            if (_json_login_data_signed.login_data_seed === require('../db/memory').db.webpeers[_index].login_data.seed) {
                                require('../db/memory').db.webpeers[_index].pub_login = _json_login_data_signed.pub;
                                console.log(require('../db/memory').db.webpeers[_index]);
                                socket.emit('data', await serialize(require('../db/memory').db.server.uuid, require('../db/memory').db.server.openpgp, { connected: true }, require('../db/memory').db.webpeers[_index].pub));
                            }
                        }
                    }
                }
            } catch (e) {
                console.log(e);
                console.log('GOT DATA (without pub) and peer not in webpeers array (maybe socket disconnected)');
            }
        });

        socket.on('data ack', async (serialized_data) => {
            console.log(`web: as ioserver got client id ${socket.client.conn.id}: data ack`);
            try {
                const _deserialized = await deserialize(require('../db/memory').db.server.openpgp, serialized_data);
                console.log(_deserialized);
            } catch (e) {
                console.log(e);
            }
        });

        socket.on('disconnect', () => {
            console.log(`web: as ioserver got client id ${socket.client.conn.id}: disconnected`);
            const _index = require('../db/memory').db.get.peer.index_sid(socket.client.conn.id, require('../db/memory').db.webpeers);
            //require('../db/memory').db.del.webpeer(_index);
            console.log(require('../db/memory').db.webpeers);
        });
    });
}