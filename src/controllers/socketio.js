
exports.init = () => {
    // think about a channel to update web clients
    require('../server').io.of('/web').on('connection', async (socket) => {
        // update socket object to memory
        require('../memory').db.server.socketweb = socket;
        console.log(`web: as ioserver got client id ${require('../memory').db.server.socketweb.client.conn.id}: connected`);

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
        
        // reuse same logic and functions from s2s
        require('../memory').db.server.socketweb.on('data', (serialized_data) => {
            console.log(`web: as ioserver got client id ${require('../memory').db.server.socketweb.client.conn.id}: data`);
            //
            require('../memory').db.server.socketweb.emit('data ack', `ackn: ${serialized_data}`);
        });

        require('../memory').db.server.socketweb.on('data ack', (serialized_data) => {
            console.log(`web: as ioserver got client id ${require('../memory').db.server.socketweb.client.conn.id}: data ack`);
        });

        require('../memory').db.server.socketweb.on('disconnect', () => {
            console.log(`web: as ioserver got client id ${require('../memory').db.server.socketweb.client.conn.id}: disconnected`);
        });
    });
}