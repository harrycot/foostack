const { serialize, deserialize } = require('../utils/common/network');



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
        
        // have to keep an array of client uuid => pub
        const _client = { uuid: false, pub: false }

        socket.on('data', async (serialized_data) => {
            console.log(`web: as ioserver got client id ${socket.client.conn.id}: data`);

            if (!_client.pub) { // it's handshake
                const data = await deserialize(require('../memory').db.server.openpgp, serialized_data);
                console.log('web: got data ; client handshake');
                console.log(data);
                _client.uuid = data.uuid; _client.pub = data.pub;
                socket.emit('data ack', await serialize(require('../memory').db.server.uuid, require('../memory').db.server.openpgp));
            } else {
                try {
                    const data = await deserialize(require('../memory').db.server.openpgp, serialized_data, _client.pub);
                    console.log('web: got data ; data');
                    console.log(data);
                    socket.emit('data ack', await serialize(require('../memory').db.server.uuid, require('../memory').db.server.openpgp, data.data, _client.pub));
                } catch (error) {
                    console.log(error);
                }
                
            }
        });


        // socket.on('data ack', (serialized_data) => {
        //     console.log(`web: as ioserver got client id ${socket.client.conn.id}: data ack`);
        // });

        socket.on('disconnect', () => {
            console.log(`web: as ioserver got client id ${socket.client.conn.id}: disconnected`);
        });
    });
}