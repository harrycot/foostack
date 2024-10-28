const path = require('node:path');
const fs = require('node:fs');
const DBFileSync = require('lowdb/adapters/FileSync');

const cwd = require('./memory').config.is_production ? process.cwd() : __dirname;

exports.db = {} // set db path when we know which port to use

exports.http = require('node:http').createServer(function(req, res){
    console.log(req.url);
    const _files = require('./memory').config.is_production
        ? []
        : [
            { req: '/styles.css', path: 'view/styles.css', type: 'text/css' },
            { req: '/body.js', path: 'view/body.js', type: 'text/javascript' },
            { req: '/socketio.js', path: '../node_modules/socket.io-client/dist/socket.io.js', type: 'text/javascript' },
            { req: '/elliptic.js', path: '../node_modules/elliptic/dist/elliptic.js', type: 'text/javascript' },
        ];
    for (file of _files) {
        if (req.url == file.req) {
            fs.readFile(path.join(cwd, file.path), function(err, data) {
                if (err) { console.log(err) }
                res.writeHead(200, require('./utils/network').get_http_headers(file.type)); res.write(data); res.end();
            }); return;
        }
    }
    fs.readFile(path.join(cwd, 'view/index.html'), function(err, data) {
        if (err) { console.log(err) }
        res.writeHead(200, require('./utils/network').get_http_headers('text/html')); res.write(data); res.end();
    });
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

    require('./controllers/socketio.s2s').init_ioserver();
    require('./controllers/socketio').init();


    process.stdin.setEncoding('utf8');
    process.stdin.on("data", (data) => {
        data = data.toString();
        console.log(`SENDING: ${data}`);
        for (peer of require('./memory').db.peers) {
            if (peer.socket.connected) {
                peer.socket.emit('data', require('./utils/network').serialize_s2s(data, peer.ecdh));
            }
        }
    })

    
    this.http.listen(_port, function() {
        console.log("server listening on port: " + _port);
    });
});


