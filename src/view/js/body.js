const socket = require('socket.io-client')('/web');
const openpgp = require('openpgp');

const { serialize, deserialize } = require('../../common/network');


const client = { uuid: false, openpgpcreds: false, serverpub: false }

socket.on('connect', async () => {
    console.log(socket.io.engine.id);
    client.uuid = require('uuid').v5('web', require('uuid').v4());
    client.openpgpcreds = await require('../../common/crypto').openpgp.generate(client.uuid, `${client.uuid}@test.local`);
    client.serverpub = false;
    console.log(client.openpgpcreds);
    socket.emit('data', await serialize(client.uuid, client.openpgpcreds)); // handshake init
});

socket.on('data', async (serialized_data) => {
    console.log(`web: as ioclient ${socket.io.engine.id} got: data`);
    const _deserialized = await deserialize(client.openpgpcreds, serialized_data, client.serverpub);
    console.log(_deserialized);
    socket.emit('data ack', await serialize(client.uuid, client.openpgpcreds, _deserialized.data, client.serverpub));

    const _json_data = _deserialized.data;
    console.log(_json_data);

    if (_json_data.login) {
        handle_login(_deserialized);
    }
});

socket.on('data ack', async (serialized_data) => {
    if (!client.serverpub) {
        console.log(`web: as ioclient ${socket.io.engine.id} got: handshake ack`);
        const _deserialized = await deserialize(client.openpgpcreds, serialized_data);
        console.log(_deserialized);
        client.serverpub = _deserialized.pub;
        //
        socket.emit('data', await serialize(client.uuid, client.openpgpcreds, { login: 'ask_login_data' }, client.serverpub));
    } else {
        console.log(`web: as ioclient ${socket.io.engine.id} got: data ack`);
        const _deserialized = await deserialize(client.openpgpcreds, serialized_data, client.serverpub);
        console.log(_deserialized);
    }
});

const handle_login = async (deserialized) => {
    const _json_data = deserialized.data;

    switch (_json_data.login) {
        case 'ask_login_data':
            // { login: 'ask_login_data', seed: _seed.seed }
            console.log('generating user keys as test:');
            _user_openpgpcreds = await require('../../common/crypto').openpgp.generate('user', 'user@test.local');
            console.log(_user_openpgpcreds);
            const _openpgp_local_priv_obj = await openpgp.readKey({ armoredKey: Buffer.from(_user_openpgpcreds.priv, 'base64').toString() });
            const _message = { text: `{ "seed": "${_json_data.seed}", "pub": "${_user_openpgpcreds.pub}" }` };
            const _unsigned = await openpgp.createCleartextMessage(_message);
            const _signed = await openpgp.sign({ message: _unsigned, signingKeys: _openpgp_local_priv_obj });
            console.log(_signed);
            // { login: 'login_data_signed', data: Buffer.from(_signed).toString('base64') } --- data: { seed: '', pub: '' }
            socket.emit('data', await serialize(client.uuid, client.openpgpcreds, { login: 'login_data_signed', data: Buffer.from(_signed).toString('base64') }, client.serverpub));
            break;
        case 'connected':
            console.log('  => Connected');
            break;
        case 'disconnected':
            console.log('  => Disconnected');
            break;
    
        default:
            break;
    }
}