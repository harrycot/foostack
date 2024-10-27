
exports.init = () => {
    require('../server').io.of('web').on('connection', async (socket) => {
        require('../memory').db.server.socket = socket;
        console.log(`web: as ioserver got client id ${require('../memory').db.server.socket.client.conn.id}: connected`);

        require('../memory').db.server.socket.on('disconnect', () => {
            console.log(`web: as ioserver got client id ${require('../memory').db.server.socket.client.conn.id}: disconnected`);
        });
    });
}