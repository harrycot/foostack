const socket = io('/web');

console.log(openpgp);

socket.on('connect', function() {
    console.log('io connected')
})
