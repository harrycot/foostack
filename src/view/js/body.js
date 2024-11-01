const socket = require('socket.io-client')('/web');
const openpgp = require('openpgp');
const { generate: _generatekeys } = require('../../utils/common/crypto').openpgp;

const { serialize, deserialize } = require('../../utils/common/network');

console.log(openpgp);

socket.on('connect', async function() {
    const keys = await _generatekeys('test', 'test@test.local');
    console.log(keys);
    
    console.log(socket);
    socket.emit('data', 'data from client');
});

socket.on('data', function() {
    console.log(`web: as ioclient ${socket.io.engine.id} got: data`);
});

socket.on('data ack', function(serialized_data) {
    console.log(`web: as ioclient ${socket.io.engine.id} got: data ack : ${serialized_data}`);
});