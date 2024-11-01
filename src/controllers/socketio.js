
exports.init = () => {
    // think about a channel to update web clients
    require('../server').io.of('/web').on('connection', async (socket) => {
        console.log(`web: as ioserver got client id ${socket.client.conn.id}: connected`);

        const cookie = require('cookie');
        // handle cookie to handle login
        require('../server').io.engine.on("headers", (headers, request) => {
            if (!request.headers.cookie) return;
            const cookies = cookie.parse(request.headers.cookie);
            //console.log(cookies);
            if (!cookies.uuid) {
                headers["set-cookie"] = cookie.serialize("uuid", "abc", { maxAge: 86400 });
            }
        });
        
        socket.on('data', (serialized_data) => {
            console.log(`web: as ioserver got client id ${socket.client.conn.id}: data`);
            //
            socket.emit('data ack', `ackn: ${serialized_data}`);
        });

        socket.on('data ack', (serialized_data) => {
            console.log(`web: as ioserver got client id ${socket.client.conn.id}: data ack`);
        });

        socket.on('disconnect', () => {
            console.log(`web: as ioserver got client id ${socket.client.conn.id}: disconnected`);
        });
    });
}