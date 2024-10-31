const socket = io('/web');

console.log(openpgp);

socket.on('connect', function() {
    console.log(socket);
    socket.emit('data', 'data from client');
});

socket.on('data', function() {
    console.log(`web: as ioclient ${socket.io.engine.id} got: data`);
});

socket.on('data ack', function(serialized_data) {
    console.log(`web: as ioclient ${socket.io.engine.id} got: data ack : ${serialized_data}`);
});