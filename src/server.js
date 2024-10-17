
// add trusted domains here
exports.trust = [];

exports.package_details = {
    is_production: process.pkg ? true : false,
    allowed_port_range: process.pkg ? { start: 443, end: 443} : { start: 8001, end: 8010 },
    network_details: {
        port: false
    }
}

const path = require('path');
const fs = require('fs');
const DBFileSync = require('lowdb/adapters/FileSync');
const session = require('express-session');
const LowdbStore = require('lowdb-session-store')(session);


exports.db = {} // set db path when we know which port to use
exports.util = {
    crypto: require('./util/crypto'),
    network: require('./util/network'),
    socketio: require('./util/socketio')
}
exports.app = require('express')();
exports.http = require('http').Server(this.app);
exports.io = require('socket.io')(this.http);

exports.ioc = this.package_details.is_production ? [{ server: 'iplist for prod'} ] : [];
exports.ios = [];

require('./util/network').get_port_to_use( (_port) => {
    if (!this.package_details.network_details.port) {
        this.package_details.network_details.port = _port;
        
        const cwd = this.package_details.is_production ? process.cwd() : __dirname;
        if (!fs.existsSync(path.join(cwd, 'db'))) { fs.mkdirSync(path.join(cwd, 'db')) }
        if (!fs.existsSync(path.join(cwd, `db/${_port}`))) { fs.mkdirSync(path.join(cwd, `db/${_port}`)) }
        this.db = {
            session: require('lowdb')(new DBFileSync(path.join(cwd, `db/${_port}/sessions.json`), { defaultValue: [] })),
            local: require('lowdb')(new DBFileSync(path.join(cwd, `db/${_port}/local.json`))),
            s2s: require('lowdb')(new DBFileSync(path.join(cwd, `db/${_port}/s2s.json`)))
        }
        // db init
        if (!this.db.s2s.has('peers').value()) {
            this.db.s2s.set('peers', []).write();
        }
        if (!this.db.local.has('uuid').value()) {
            this.db.local.set('uuid', require('uuid').v4()).write();
        }
        if (!this.db.local.has('keys.ecdsa').value()) {
            this.util.crypto.ecdsa.generate();
        }
        if (!this.db.local.has('keys.ecdh').value()) {
            this.util.crypto.ecdh.generate();
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

        this.http.listen(this.app.get('port'), () => {
            console.log('App is running at http://localhost:%d', this.app.get('port'));
        });
    }
});


