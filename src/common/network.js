exports.serialize = async (uuid, openpgpcreds, data, pub) => {
    const openpgp = require('openpgp');

    const _openpgp_local_priv_obj = await openpgp.readKey({ armoredKey: Buffer.from(openpgpcreds.priv, 'base64').toString() });

    const _message = data
        ? { text: `{ "uuid": "${uuid}", "data": "${
            Buffer.from(await openpgp.encrypt({
                message: await openpgp.createMessage({ text: data }),
                encryptionKeys: await openpgp.readKey({ armoredKey: Buffer.from(pub, 'base64').toString() }),
                signingKeys: _openpgp_local_priv_obj
            })).toString('base64')
        }" }` }
        : { text: `{ "uuid": "${uuid}", "pub": "${openpgpcreds.pub}" }` };

    const _unsigned = await openpgp.createCleartextMessage(_message);
    const _signed = await openpgp.sign({ message: _unsigned, signingKeys: _openpgp_local_priv_obj });

    return Buffer.from(_signed).toString('base64');
}

exports.deserialize = async (openpgpcreds, serialized_data, openpgp_pub) => {
    // if !openpgp_pub, it's s2s
    const openpgp = require('openpgp');

    const _signed = await openpgp.readCleartextMessage({ cleartextMessage: Buffer.from(serialized_data, 'base64').toString() });
    const _json_data = JSON.parse(_signed.text); _json_data.err = {};


    if (!openpgp_pub) {
        is_peer_exist = require('../server/db/memory').db.get.peer.exist(_json_data.uuid, require('../server/db/memory').db.peers);
        is_webpeer_exist = require('../server/db/memory').db.get.peer.exist(_json_data.uuid, require('../server/db/memory').db.webpeers);
        console.log(is_peer_exist); console.log(is_webpeer_exist);
        if (is_peer_exist) {
            openpgp_pub = require('../server/db/memory').db.peers[require('../server/db/memory').db.get.peer.index(_json_data.uuid, require('../server/db/memory').db.peers)].openpgp;
        } else if (is_webpeer_exist) {
            openpgp_pub = require('../server/db/memory').db.webpeers[require('../server/db/memory').db.get.peer.index(_json_data.uuid, require('../server/db/memory').db.webpeers)].openpgp;
        }
    }
    const _json_data_openpgp_pub_obj = !_json_data.data
        ? await openpgp.readKey({ armoredKey: Buffer.from(_json_data.pub, 'base64').toString() })
        : await openpgp.readKey({ armoredKey: Buffer.from(openpgp_pub, 'base64').toString() });

    const _openpgp_local_priv_obj = await openpgp.readKey({ armoredKey: Buffer.from(openpgpcreds.priv, 'base64').toString() });

    const _verify_result_clear = await openpgp.verify({ message: _signed, verificationKeys: _json_data_openpgp_pub_obj });
    
    try { await _verify_result_clear.signatures[0].verified } catch (e) { _json_data.err.signature_clear = `clear: Signature could not be verified: ${e.message}` }

    if (_json_data.data) {
        const _message = await openpgp.readMessage({
            armoredMessage: Buffer.from(_json_data.data, 'base64').toString()
        });
        const { data: decrypted, signatures } = await openpgp.decrypt({
            message: _message, verificationKeys: _json_data_openpgp_pub_obj, decryptionKeys: _openpgp_local_priv_obj
        });
        try {
            await signatures[0].verified;
            _json_data.data = decrypted;
        } catch (e) {
            _json_data.err.signature_data = `data: Signature could not be verified: ${e.message}`
        }
    }

    return _json_data;
}