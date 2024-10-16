const server = require('../server');
const path = require('path');

/**
 * App Express init
 */
exports.init = (host, port) => {
    server.app.set('host', host);
    server.app.set('port', port);


    server.app.set('views', path.join(__dirname, '../views'));
    server.app.engine('pug', require('pug').__express);
    server.app.set('view engine', 'pug');


    /**
     * Controllers (route handlers).
     */
    const r_root = require('./routes/root');
    server.app.get('/', r_root.get);
}