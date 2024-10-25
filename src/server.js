const path = require('path');
const fs = require('fs');
const DBFileSync = require('lowdb/adapters/FileSync');
//const LowdbStore = require('lowdb-session-store')(session);

const cwd = require('./memory').config.is_production ? process.cwd() : __dirname;

exports.db = {} // set db path when we know which port to use

exports.http = require('http').createServer(function(req, res){
    console.log(req.url);
    switch (req.url) {
        case '/styles.css':
            fs.readFile(path.join(cwd, 'view/styles.css'), function(err, data) {
                if (err) { console.log(err) }
                res.writeHead(200, require('./utils/network').get_http_headers('text/css')); res.write(data); res.end();
            }); break;
    
        default:
            fs.readFile(path.join(cwd, 'view/index.html'), function(err, data) {
                if (err) { console.log(err) }
                res.writeHead(200, require('./utils/network').get_http_headers('text/html')); res.write(data); res.end();
            }); break;
    }
});

exports.io = require('socket.io')(this.http);

if (!require('./memory').config.is_production) {
    for (let port = require('./memory').config.port_range.start; port <= require('./memory').config.port_range.end; port++) {
        require('./memory').db.peers.push({ server: `localhost:${port}`});
    }
} else {
    // push server list for prod
}

require('./utils/network').get_port_to_use( (_port) => {
    require('./memory').config.network.port = _port;
    
    if (!fs.existsSync(path.join(cwd, 'db'))) { fs.mkdirSync(path.join(cwd, 'db')) }
    if (!fs.existsSync(path.join(cwd, `db/${_port}`))) { fs.mkdirSync(path.join(cwd, `db/${_port}`)) }
    this.db = {
        session: require('lowdb')(new DBFileSync(path.join(cwd, `db/${_port}/sessions.json`), { defaultValue: [] })),
    }
    // db init
    if (!require('./memory').db.server.uuid) {
        require('./memory').db.server.uuid = require('./utils/crypto').uuid.generate();
    }
    if (!require('./memory').db.server.keys.ecdsa) {
        require('./memory').db.server.keys.ecdsa = require('./utils/crypto').ecdsa.generate();
    }
    if (!require('./memory').db.server.keys.ecdh) {
        require('./memory').db.server.keys.ecdh = require('./utils/crypto').ecdh.generate();
    }

    //require('./controllers/socketio').init();
    require('./controllers/socketio.s2s').init_ioserver();


    process.stdin.setEncoding('utf8');
    process.stdin.on("data", (data) => {
        data = data.toString();
        console.log(`SENDING: ${data}`);
        for (peer of require('./memory').db.peers) {
            if (peer.socket.connected) {
                peer.socket.emit('data', require('./utils/network').serialize_s2s(data, peer.ecdh)); // calling serialize_s2s() without giving data == it's an handshake
            }
        }
    })

    
    this.http.listen(_port, function() {
        console.log("server listening on port: " + _port);
    });
});


