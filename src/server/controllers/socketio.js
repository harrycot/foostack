const { serialize, deserialize } = require('../../common/network');

exports.init = () => {
    // think about a channel to update web clients
    require('../server').io.of('/web').on('connection', async (socket) => {
        console.log(`web: as ioserver got client id ${socket.client.conn.id}: connected`);

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
                    //const _index = require('../db/memory').db.get.peer.index_uuid(_deserialized.uuid, require('../db/memory').db.webpeers);
                    //socket.emit('data ack', await serialize(require('../db/memory').db.server.uuid, require('../db/memory').db.server.openpgp, _deserialized.data, require('../db/memory').db.webpeers[_index].pub));
                    // end of ack
                    
                    const _json_data = JSON.parse(_deserialized.data);
                    if (_json_data.login) {
                        handle_login(socket, _deserialized);
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

const handle_login = async (socket, deserialized) => {
    const _index = require('../db/memory').db.get.peer.index_uuid(deserialized.uuid, require('../db/memory').db.webpeers);
    const _json_data = JSON.parse(deserialized.data);

    if (require('../db/memory').db.webpeers[_index].login && require('../db/memory').db.webpeers[_index].login.pub) { // already connected
        socket.emit('data', await serialize(require('../db/memory').db.server.uuid, require('../db/memory').db.server.openpgp, { login: 'connected' }, require('../db/memory').db.webpeers[_index].pub));
    } else {
        switch (_json_data.login) {
            case 'ask_login_data':
                // { login: 'ask_login_data' }
                const _seed = require('../utils/crypto').misc.generate.seed(50,100,'base64');
                require('../db/memory').db.webpeers[_index].login = { ask_login_data: _seed };
                // => { login: 'ask_login_data', seed: _seed.seed }
                socket.emit('data', await serialize(require('../db/memory').db.server.uuid, require('../db/memory').db.server.openpgp, { login: 'ask_login_data', seed: _seed.seed }, require('../db/memory').db.webpeers[_index].pub));
                break;
    
            case 'login_data_signed':
                // { login: 'login_data_signed', data: Buffer.from(_signed).toString('base64') } --- data: { seed: '', pub: '' }
                const openpgp = require('openpgp');
                const _signed = await openpgp.readCleartextMessage({ cleartextMessage: Buffer.from(_json_data.data, 'base64').toString() });
                const _json_login_data_signed = JSON.parse(_signed.text); _json_login_data_signed.err = {};
                const _json_data_openpgp_pub_obj = await openpgp.readKey({ armoredKey: Buffer.from(_json_login_data_signed.pub, 'base64').toString() });
                const _verify_result_clear = await openpgp.verify({ message: _signed, verificationKeys: _json_data_openpgp_pub_obj });
                try { await _verify_result_clear.signatures[0].verified } catch (e) { _json_login_data_signed.err.signature_clear = `clear: Signature could not be verified: ${e.message}` }
                if (!Object.keys(_json_login_data_signed.err).length) {
                    if (_json_login_data_signed.seed === require('../db/memory').db.webpeers[_index].login.ask_login_data.seed) {
                        require('../db/memory').db.webpeers[_index].login.pub = _json_login_data_signed.pub;
                        console.log(require('../db/memory').db.webpeers[_index]);
                        // => { login: 'connected' }
                        socket.emit('data', await serialize(require('../db/memory').db.server.uuid, require('../db/memory').db.server.openpgp, { login: 'connected' }, require('../db/memory').db.webpeers[_index].pub));
                    } else {
                        require('../db/memory').db.del.webpeer.index(_index);
                    }
                } else {
                    require('../db/memory').db.del.webpeer.index(_index);
                }
                break;

            case 'disconnect':
                // { login: 'disconnect' }
                // => { login: 'disconnected' }
                socket.emit('data', await serialize(require('../db/memory').db.server.uuid, require('../db/memory').db.server.openpgp, { login: 'disconnected' }, require('../db/memory').db.webpeers[_index].pub));
                require('../db/memory').db.webpeers[_index].login = {};
                break;
        
            default:
                break;
        }
    }
}