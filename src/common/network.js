exports.serialize = async (uuid, openpgpcreds, data, pub) => {
    const _date = new Date(Date.now() - 1000);
    if ( typeof data !== 'string' ){ data = JSON.stringify(data) }
    const openpgp = require('openpgp');

    const _openpgp_local_priv_obj = await openpgp.readKey({ armoredKey: Buffer.from(openpgpcreds.priv, 'base64').toString() });

    const _message = data
        ? { text: `{ "uuid": "${uuid}", "data": "${
            Buffer.from(await openpgp.encrypt({
                date: _date,
                message: await openpgp.createMessage({ text: data }),
                encryptionKeys: await openpgp.readKey({ armoredKey: Buffer.from(pub, 'base64').toString() }),
                signingKeys: _openpgp_local_priv_obj
            })).toString('base64')
        }" }` }
        : { text: `{ "uuid": "${uuid}", "pub": "${openpgpcreds.pub}", "port": "${require('../server/db/memory').config.network.port}" }` };

    const _unsigned = await openpgp.createCleartextMessage(_message);
    const _signed = await openpgp.sign({ date: _date, message: _unsigned, signingKeys: _openpgp_local_priv_obj });

    return Buffer.from(_signed).toString('base64');
}

exports.deserialize = async (openpgpcreds, serialized_data, openpgp_pub) => {
    const _date = new Date(Date.now());
    const openpgp = require('openpgp');

    const _signed = await openpgp.readCleartextMessage({ cleartextMessage: Buffer.from(serialized_data, 'base64').toString() });
    const _json_data = JSON.parse(_signed.text); _json_data.err = {};

    if (!openpgp_pub) { // keep priority to peer in case
        is_peer_exist = require('../server/db/memory').db.get.peer.exist_uuid(_json_data.uuid, require('../server/db/memory').db.peers);
        is_webpeer_exist = require('../server/db/memory').db.get.peer.exist_uuid(_json_data.uuid, require('../server/db/memory').db.webpeers);
        if (is_peer_exist) {
            openpgp_pub = require('../server/db/memory').db.peers[require('../server/db/memory').db.get.peer.index_uuid(_json_data.uuid, require('../server/db/memory').db.peers)].pub;
        } else if (is_webpeer_exist) {
            openpgp_pub = require('../server/db/memory').db.webpeers[require('../server/db/memory').db.get.peer.index_uuid(_json_data.uuid, require('../server/db/memory').db.webpeers)].pub;
        } else if ( (!is_peer_exist && _json_data.data) || (!is_webpeer_exist && _json_data.data) ) {
            return false; // data received without handshake done: ignore
        }
    }
    const _json_data_openpgp_pub_obj = !_json_data.data
        ? await openpgp.readKey({ armoredKey: Buffer.from(_json_data.pub, 'base64').toString() }) // handshake
        : await openpgp.readKey({ armoredKey: Buffer.from(openpgp_pub, 'base64').toString() }); // data

    const _openpgp_local_priv_obj = await openpgp.readKey({ armoredKey: Buffer.from(openpgpcreds.priv, 'base64').toString() });

    const _verify_result_clear = await openpgp.verify({ date: _date, message: _signed, verificationKeys: _json_data_openpgp_pub_obj });
    
    try { await _verify_result_clear.signatures[0].verified } catch (e) { _json_data.err.signature_clear = `clear: Signature could not be verified: ${e.message}` }

    if (_json_data.data) {
        const _message = await openpgp.readMessage({
            armoredMessage: Buffer.from(_json_data.data, 'base64').toString()
        });
        const { data: _decrypted, signatures: _signatures } = await openpgp.decrypt({
            date: _date, message: _message, verificationKeys: _json_data_openpgp_pub_obj, decryptionKeys: _openpgp_local_priv_obj
        });
        try {
            await _signatures[0].verified;
            _json_data.data = JSON.parse(_decrypted); // Signature creation time is in the future: https://github.com/harrycot/foostack/issues/7
        } catch (e) {
            _json_data.err.signature_data = `data: Signature could not be verified: ${e.message}`
        }
    }

    return _json_data;
}