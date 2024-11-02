const { serialize, deserialize } = require('../../common/network');

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
        
        socket.on('data', async (serialized_data) => {
            console.log(`web: as ioserver got client id ${socket.client.conn.id}: data`);

            try {
                const _deserialized = await deserialize(require('../db/memory').db.server.openpgp, serialized_data);
                console.log('web: got data ; client handshake');
                console.log(_deserialized);
                if (!require('../db/memory').db.get.peer.exist(_deserialized.uuid, require('../db/memory').db.webpeers)) {
                    console.log('doesnt exist');
                    require('../db/memory').db.set.webpeer(require('../db/memory').db.webpeers.length, _deserialized); // ADD PEER - ADD PEER - ADD PEER - ADD PEER
                }
                console.log(require('../db/memory').db.webpeers);
                socket.emit('data ack', await serialize(require('../db/memory').db.server.uuid, require('../db/memory').db.server.openpgp));
            } catch (e) {
                require('../db/memory').db.webpeers;
                const _deserialized = await deserialize(require('../db/memory').db.server.openpgp, serialized_data);
                console.log('web: got data ; data');
                console.log(_deserialized);
                require('../db/memory').db.set.webpeer(index = false, _deserialized); // UPDATE PEER - UPDATE PEER - UPDATE PEER - UPDATE PEER
                socket.emit('data ack', await serialize(require('../db/memory').db.server.uuid, require('../db/memory').db.server.openpgp, _deserialized.data, require('../db/memory').db.webpeers[_index].pub));                
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