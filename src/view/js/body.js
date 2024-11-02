const socket = require('socket.io-client')('/web');
const openpgp = require('openpgp');

const client = { uuid: require('uuid').v4(), openpgpcreds: false, serverpub: false }

const { serialize, deserialize } = require('../../utils/common/network');

// console.log(openpgp);

socket.on('connect', async () => {
    client.openpgpcreds = await require('../../utils/common/crypto').openpgp.generate('test', 'test@test.local');
    console.log(client.openpgpcreds);
    socket.emit('data', await serialize(client.uuid, client.openpgpcreds));
});

socket.on('data', () => {
    console.log(`web: as ioclient ${socket.io.engine.id} got: data`);
});

socket.on('data ack', async (serialized_data) => {
    console.log(`web: as ioclient ${socket.io.engine.id} got: data ack`);
    if (!client.serverpub) {
        const data = await deserialize(client.openpgpcreds, serialized_data);
        console.log('got data ack ; server handshake:');
        console.log(data);
        client.serverpub = data.pub;
        //
        console.log('sending DATA TEST');
        socket.emit('data', await serialize(client.uuid, client.openpgpcreds, "DATA TEST", client.serverpub));
    } else {
        const data = await deserialize(client.openpgpcreds, serialized_data, client.serverpub);
        console.log('got data ack ; data:');
        console.log(data);
    }
    
});