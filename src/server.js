const path = require('path');
const fs = require('fs');
const DBFileSync = require('lowdb/adapters/FileSync');
const session = require('express-session');
const LowdbStore = require('lowdb-session-store')(session);

const memory = require('./memory');

exports.db = {} // set db path when we know which port to use

exports.app = require('express')();
exports.http = require('http').Server(this.app);
exports.io = require('socket.io')(this.http);

exports.ios = { client: '', socket: '', s2s_uuid: '', s2s_ecdh: '', s2s_ecdsa: '' };
exports.ioc = memory.is_production ? [{ server: 'iplist for prod'} ] : [];

require('./utils/network').get_port_to_use( (_port) => {
    if (!memory.network_details.port) {
        memory.network_details.port = _port;
        
        const cwd = memory.is_production ? process.cwd() : __dirname;
        if (!fs.existsSync(path.join(cwd, 'db'))) { fs.mkdirSync(path.join(cwd, 'db')) }
        if (!fs.existsSync(path.join(cwd, `db/${_port}`))) { fs.mkdirSync(path.join(cwd, `db/${_port}`)) }
        this.db = {
            session: require('lowdb')(new DBFileSync(path.join(cwd, `db/${_port}/sessions.json`), { defaultValue: [] })),
            s2s: require('lowdb')(new DBFileSync(path.join(cwd, `db/${_port}/s2s.json`)))
        }
        // db init
        if (!memory.server_data.uuid) {
            memory.server_data.uuid = require('./utils/crypto').uuid.generate();
        }
        if (!memory.server_data.keys.ecdsa) {
            memory.server_data.keys.ecdsa = require('./utils/crypto').ecdsa.generate();
        }
        if (!memory.server_data.keys.ecdh) {
            memory.server_data.keys.ecdh = require('./utils/crypto').ecdh.generate();
        }
        // END OF db init

        // SESSION EXPRESS share with SOCKETIO
        const express_session = session({
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
            cookie: { secure: true, maxAge: 1209600000 }, // two weeks in milliseconds
            store: new LowdbStore(this.db.session, {
                ttl: 86400
            })
        });
        this.io.use(function (socket, next) {
            express_session(socket.request, socket.request.res, next);
        });
        this.app.use(express_session);

        // Init Express and Socketio controller
        require('./controllers/express').init('0.0.0.0', _port);
        require('./controllers/socketio').init();
        require('./controllers/socketio.s2s').init_ios();


        process.stdin.setEncoding('utf8');
        process.stdin.on("data", (data) => {
            data = data.toString();
            console.log(`SENDING: ${data}`);
            // start working on db sync across nodes here
            for (sc of this.ioc) {
                if (sc.s2s_ecdh) {
                    sc.socket.emit("data", require('./utils/network').serialize_s2s(data, sc.s2s_ecdh)); // calling serialize_s2s() without giving data == it's an handshake
                }
            }
        })


        this.http.listen(this.app.get('port'), () => {
            console.log('App is running at http://localhost:%d', this.app.get('port'));
        });
    }
});


