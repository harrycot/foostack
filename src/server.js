const path = require('path');
const fs = require('fs');
const DBFileSync = require('lowdb/adapters/FileSync');
//const LowdbStore = require('lowdb-session-store')(session);

const memory = require('./memory');

exports.db = {} // set db path when we know which port to use

exports.http = require('http').createServer(function(req, res){
    console.log(req.url);
    switch (req.url) {
        case '/styles.css':
            fs.readFile(path.resolve(__dirname, './view/styles.css'), function(err, data) {
                if (err) { console.log(err) }
                res.writeHead(200, {'Content-Type': 'text/css'}); res.write(data); res.end();
            }); break;
    
        default:
            fs.readFile(path.resolve(__dirname, './view/index.html'), function(err, data) {
                if (err) { console.log(err) }
                res.writeHead(200, {'Content-Type': 'text/html'}); res.write(data); res.end();
            }); break;
    }
});

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

        //require('./controllers/socketio').init();
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

        this.http.listen(_port, function() {
            console.log("server listening on port: " + _port);
        });
    }
});


