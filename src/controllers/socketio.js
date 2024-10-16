const server = require('../server');

/**
 * App Express init
 */
exports.init = () => {
    server.io.on('connection', async (socket) => {
        console.log("New connection to default namespace");

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });
    });
}