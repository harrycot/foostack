const socket = io('/web');

socket.on('connect', function() {
    console.log('io connected')
})
