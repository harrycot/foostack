
exports.init = () => {
    require('../server').io.of('/web').on('connection', async (socket) => {
        require('../memory').db.server.socket = socket;
        console.log(`web: as ioserver got client id ${require('../memory').db.server.socket.client.conn.id}: connected`);

        const cookie = require('cookie');
        // handle cookie to handle login
        require('../server').io.engine.on("headers", (headers, request) => {
            if (!request.headers.cookie) return;
            const cookies = cookie.parse(request.headers.cookie);
            console.log(cookies);
            if (!cookies.uuid) {
                headers["set-cookie"] = cookie.serialize("uuid", "abc", { maxAge: 86400 });
            }
        });

        
        // reuse same logic and functions from s2s
        // io.to(socketId).emit(/* ... */); to individual socketid (private message)
        require('../memory').db.server.socket.on('data', (serialized_data) => {
            require('./socketio.common').on_data_common(index = false, serialized_data, send_ack = true);
        });

        require('../memory').db.server.socket.on('data ack', (serialized_data) => {
            require('./socketio.common').on_data_common(index = false, serialized_data, send_ack = false);
        });

        require('../memory').db.server.socket.on('disconnect', () => {
            console.log(`web: as ioserver got client id ${require('../memory').db.server.socket.client.conn.id}: disconnected`);
        });
    });
}