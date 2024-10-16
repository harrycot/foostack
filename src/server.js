
// add trusted domains here
exports.trust = [];

exports.is_production = process.pkg ? true : false;

const path = require('path');
const fs = require('fs');
const DBFileSync = require('lowdb/adapters/FileSync');
const session = require('express-session');
const LowdbStore = require('lowdb-session-store')(session);

const cwd = this.is_production ? process.cwd() : __dirname;

/**
 * Server needs
 */
if (!fs.existsSync(path.join(cwd, 'db'))) {
    fs.mkdirSync(path.join(cwd, 'db'));
}
exports.db = {
    session: require('lowdb')(new DBFileSync(path.join(cwd, 'db/sessions.json'), { defaultValue: [] })),
    local: require('lowdb')(new DBFileSync(path.join(cwd, 'db/local.json'))),
    s2s: require('lowdb')(new DBFileSync(path.join(cwd, 'db/s2s.json')))
}
exports.util = {
    crypto: require('./util/crypto'),
    network: require('./util/network'),
    socketio: require('./util/socketio')
}
exports.app = require('express')();
exports.http = require('http').Server(this.app);
exports.io = require('socket.io')(this.http);

exports.ioc = this.is_production ? [{ server: 'localhost:8080' }, { server: 'localhost:8081' }, { server: 'localhost:8082' }] : [];
exports.ios = [];

if (!this.db.s2s.has('peers').value()) {
    this.db.s2s.set('peers', [])
        .write();
}
if (!this.db.local.has('uuid').value()) {
    const { v4 } = require('uuid');
    this.db.local.set('uuid', v4())
        .write();
}
if (!this.db.local.has('keys.ecdsa').value()) {
    this.util.crypto.ecdsa.generate();
}
if (!this.db.local.has('keys.ecdh').value()) {
    this.util.crypto.ecdh.generate();
}

// Request DNS to get Node server list
const dns = require('dns');
for (domain of this.trust) {
    dns.lookup(domain, (err, address, family) => {
        if (this.is_production) { console.log('address: %j family: IPv%s', address, family) };
        this.ioc.push({ server: address });
    });
}
//const address = this.network.get_external_ipv4();
//console.log(address);

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
require('./controllers/express').init('0.0.0.0', 8081);
require('./controllers/socketio').init();
require('./controllers/socketio.s2s').init_ios();

// Start Express server.
this.http.listen(this.app.get('port'), () => {
    console.log('App is running at http://localhost:%d', this.app.get('port'));
    console.log('  Press CTRL-C to stop\n');
});