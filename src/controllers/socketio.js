
exports.init = () => {
    require('../server').io.of('/web').on('connection', async (socket) => {
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

        require('../memory').db.server.socket = socket;
        console.log(`web: as ioserver got client id ${require('../memory').db.server.socket.client.conn.id}: connected`);

        require('../memory').db.server.socket.on('disconnect', () => {
            console.log(`web: as ioserver got client id ${require('../memory').db.server.socket.client.conn.id}: disconnected`);
        });
    });
}