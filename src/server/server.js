const path = require('node:path');
const fs = require('node:fs');
const DBFileSync = require('lowdb/adapters/FileSync');

exports.config = { 
    is_production: process.pkg ? true : process.env.NODE_ENV == 'production' ? true : false,
    port_range: process.pkg ? { start: 443, end: 443} : { start: 8001, end: 8010 },
    network: { ip: { v4: false, v6: false }, port: false },
    owner_pub: 'openpgp pub key'
}

const cwd = this.config.is_production ? process.cwd() : __dirname;

exports.db = {} // set db path when we know which port to use

exports.http = require('node:http').createServer(function(req, res){
    console.log(req.url);
    const _files = require('../server/server').config.is_production
        ? [] // use webpack
        : [
            { req: '/styles.css', path: '../view/scss/styles.bundle.css', type: 'text/css' },
            { req: '/body.js', path: '../view/js/body.bundle.js', type: 'text/javascript' },
        ];
    for (file of _files) {
        if (req.url == file.req) {
            fs.readFile(path.join(cwd, file.path), function(err, data) {
                if (err) { console.log(err) }
                res.writeHead(200, require('./utils/network').get_http_headers(file.type)); res.write(data); res.end();
            }); return;
        }
    }
    fs.readFile(path.join(cwd, '../view/index.html'), function(err, data) {
        if (err) { console.log(err) }
        res.writeHead(200, require('./utils/network').get_http_headers('text/html')); res.write(data); res.end();
    });
});

exports.io = require('socket.io')(this.http, {
    cookie: {
        name: require('./utils/crypto').misc.generate.seed_int(100,4096),
        path: "/",
        httpOnly: true,
        sameSite: "strict",
        secure: false
    }
});

if (!this.config.is_production) {
    for (let _port = this.config.port_range.start; _port <= this.config.port_range.end; _port++) {
        require('./db/memory').db.peers.push({ server: `localhost:${_port}`});
    }
} else {
    // push server list for prod
}

require('./utils/network').get_port_to_use( async (port) => {
    this.config.network.port = port;
    
    if (!fs.existsSync(path.join(cwd, 'db'))) { fs.mkdirSync(path.join(cwd, 'db')) }
    if (!fs.existsSync(path.join(cwd, `db/${port}`))) { fs.mkdirSync(path.join(cwd, `db/${port}`)) }
    this.db = {
        blockchain: require('lowdb')(new DBFileSync(path.join(cwd, `db/${port}/blockchain.json`), { defaultValue: [{ block: 0, data: '', prev: false }] })),
    }
    // db init

    if (!require('./db/memory').db.server.uuid) {
        require('./db/memory').db.server.uuid = require('uuid').v5('s2s', require('uuid').v4());
        console.log(`\n  => Server init with uuid: ${require('./db/memory').db.server.uuid}\n`);
    }
    if (!require('./db/memory').db.server.openpgp) {
        require('./db/memory').db.server.openpgp = await require('../common/crypto').openpgp.generate(
            require('./db/memory').db.server.uuid,
            `${require('./db/memory').db.server.uuid}@localhost.local`
        );
    }

    require('./controllers/socketio.s2s').init();
    require('./controllers/socketio').init();

    
    require('./controllers/cron').init();
    require('./db/file').init();


    process.stdin.setEncoding('utf8');
    process.stdin.on("data", async (data) => {
        data = data.toString();
        const _block = require('./db/file').new_block(data);
        console.log(`SENDING New block: ${_block}`);
        for (peer of require('./db/memory').db.peers) {
            if (peer.socket.connected) {
                peer.socket.emit('data', await require('../common/network').serialize(
                    require('./db/memory').db.server.uuid, require('./db/memory').db.server.openpgp, _block, peer.pub
                ));
            }
        }
    })

    
    this.http.listen(port, () => {
        console.log("server listening on port: http://localhost:" + port);
    });
});


