const path = require('node:path');
const fs = require('node:fs');

exports.is_production = process.pkg ? true : process.env.NODE_ENV == 'production' ? true : false;

const cwd = this.is_production ? process.cwd() : __dirname;

exports.http = require('node:http').createServer( (req, res) => {
    console.log(req.url);
    const _files = require('./server').is_production
        ? [] // use webpack
        : [
            { req: '/styles.css', path: '../view/scss/styles.bundle.css', type: 'text/css' },
            { req: '/body.js', path: '../view/js/body.bundle.js', type: 'text/javascript' },
        ];
    for (file of _files) {
        if (req.url == file.req) {
            fs.readFile(path.join(cwd, file.path), (err, data) => {
                if (err) { console.log(err) }
                res.writeHead(200, require('./utils/network').get_http_headers(file.type)); res.write(data); res.end();
            }); return;
        }
    }
    fs.readFile(path.join(cwd, '../view/index.html'), (err, data) => {
        if (err) { console.log(err) }
        res.writeHead(200, require('./utils/network').get_http_headers('text/html')); res.write(data); res.end();
    });
});

exports.io = require('socket.io')(this.http, {
    cookie: {
        name: require('./utils/crypto').misc.generate.seed_int(100,4096),
        path: "/", httpOnly: true, sameSite: "strict", secure: false
    }
});

if (!this.is_production) {
    require('./db/memory').db.peers = [
        { server: '::ffff:127.0.0.1', port: '8001' }
    ];
} else {
    require('./db/memory').db.peers = [
        { server: 'IP:PORT' },
        { server: 'IP:PORT' }
    ];
}
require('./db/memory').db.default_peers = [...require('./db/memory').db.peers];

require('./utils/network').get_port_to_use( async (port) => {
    require('./db/memory').config.network.port = port;

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
    require('./db/blockchain').init(port);


    process.stdin.setEncoding('utf8');
    process.stdin.on("data", async (data) => {
        data = data.toString();
        const _block = require('./db/blockchain').new_block(data);
        const _data = { blockchain: 'new_block', block: _block }
        console.log(`\n\nSENDING New block: ${_block.block}`);

        //console.log(require('./db/memory').db.peers);

        for (peer of require('./db/memory').db.peers) {
            if (peer.socket.connected) {
                peer.socket.emit('data', await require('../common/network').serialize(
                    require('./db/memory').db.server.uuid, require('./db/memory').db.server.openpgp, _data, peer.pub
                ));
            }
        }
    })

    
    this.http.listen({ port: port }, () => {
        console.log(`  server listening on port: ${port}\n`);
    });
});


