const path = require('node:path');
const fs = require('node:fs');
const DBFileSync = require('lowdb/adapters/FileSync');

const CONST_HASH = 'sha512';
const CONST_HASH_ENCODING = 'base64';

const cwd = require('../server').is_production ? process.cwd() : __dirname;

exports.blockchain = false;

exports.init = (port) => {   
    if (!fs.existsSync(path.join(cwd, '_blockchain'))) { fs.mkdirSync(path.join(cwd, '_blockchain')) }
    if (!fs.existsSync(path.join(cwd, `_blockchain/${port}`))) { fs.mkdirSync(path.join(cwd, `_blockchain/${port}`)) }
    this.blockchain = require('lowdb')(new DBFileSync(path.join(cwd, `_blockchain/${port}/blockchain.json`), { defaultValue: [{ block: 0, data: '', prev: false }] }));
    

    this.verify_chain();
}



exports.new_block = (data) => {
    const _last_block = this.blockchain.last().value();
    const _prev_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(_last_block)).digest(CONST_HASH_ENCODING);
    const _block = { block: _last_block.block+1, data: data, prev: _prev_hash };
    this.blockchain.push(_block).write();
    return _block;
}

exports.new_block_from_node = (block) => {
    const _last_block = this.blockchain.last().value();
    const _last_block_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(_last_block)).digest(CONST_HASH_ENCODING);
    if (_last_block_hash === block.prev) {
        this.blockchain.push(block).write();
    }
}

exports.sync_chain = async (callback_data) => {
    if ( !callback_data && !require('./memory').db.state.is_blockchain_sync ) {
        console.log('\n SYNC CHAIN\n');
        require('./memory').db.state.is_blockchain_sync = true;
        for (peer of require('./memory').db.peers) { // maybe dont ask every peer
            if (peer.socket.connected) {
                const _data = { blockchain: 'get_firstlast', callback: 'sync_chain', server: peer.server, port: peer.port };
                require('./memory').db.blockchain.firstlast.all.push(_data);
                peer.socket.emit('data', await require('../../common/network').serialize(
                    require('./memory').db.server.uuid, require('./memory').db.server.openpgp, _data, peer.pub
                ));
            }
        }
        setTimeout(() => { // 10s
            // remove timeout
            for (let index = 0; index < require('../db/memory').db.blockchain.firstlast.all.length; index++) {
                if (!require('./memory').db.blockchain.firstlast.all[index].response) {
                    require('./memory').db.blockchain.firstlast.all.splice(index, 1);
                    index--;
                }
            }
            this.sync_chain({ blockchain: 'get_firstlast', timeout: true });
        }, 10*1000); // 10s
    } else {
        // { blockchain: 'get_firstlast', first_last: { first: x, last: x }, server: 'IP:PORT' };
        switch (callback_data.blockchain) {
            case 'get_block':
                if (callback_data.reason){
                    switch (callback_data.reason) {
                        case 'full_sync':
                            // write the new block
                            this.blockchain.push(callback_data.response).write();

                            if (require('./memory').db.blockchain.firstlast.trusted[0].response.last.block != callback_data.response.block) {
                                const _trusted_last_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(require('./memory').db.blockchain.firstlast.trusted[0].response.last)).digest(CONST_HASH_ENCODING);
                                const _random_peer_firstlast = require('./memory').db.blockchain.firstlast.grouped[_trusted_last_hash].length > 1
                                    ? require('./memory').db.blockchain.firstlast.grouped[_trusted_last_hash][require('node:crypto').randomInt(0, require('./memory').db.blockchain.firstlast.grouped[_trusted_last_hash].length-1)]
                                    : require('./memory').db.blockchain.firstlast.grouped[_trusted_last_hash][0];

                                const _data = { blockchain: 'get_block', block: callback_data.response.block+1, reason: 'full_sync', callback: 'sync_chain' };
                                const _peer_index = require('./memory').db.get.peer.index_server(_random_peer_firstlast.server, _random_peer_firstlast.port);
                                require('./memory').db.peers[_peer_index].socket.emit('data', await require('../../common/network').serialize(
                                    require('./memory').db.server.uuid, require('./memory').db.server.openpgp, _data, require('./memory').db.peers[_peer_index].pub
                                ));
                            } else {
                                console.log('\n\n Full sync done !');
                                require('./memory').db.blockchain.firstlast = { all: [], trusted: [], grouped: {} }; // reset firstlast
                                this.verify_chain();
                            }
                            break;
                        default:
                            break;
                    }
                }

                break;
            case 'get_firstlast':
                for (let index = 0; index < require('../db/memory').db.blockchain.firstlast.all.length; index++) {
                    if (require('./memory').db.blockchain.firstlast.all[index].server === callback_data.server
                        && require('./memory').db.blockchain.firstlast.all[index].port === callback_data.port) {
                            require('./memory').db.blockchain.firstlast.all[index].response = callback_data.response;
                    }
                }

                if (callback_data.timeout) { // on timeout do
                    console.log('\n\n  => blockchain firstlast array done:');
                    console.log(require('./memory').db.blockchain.firstlast.all);

                    const _first_block = this.blockchain.first().value();
                    const _first_block_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(_first_block)).digest(CONST_HASH_ENCODING);
                    const _last_block = this.blockchain.last().value();
                    const _last_block_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(_last_block)).digest(CONST_HASH_ENCODING);

                    // require('./memory').db.blockchain.firstlast.trusted containing only 1 blockchain.firstlast.all[x] element
                    // require('./memory').db.blockchain.firstlast.grouped containing all but grouped by last block hash
                    for (let index = 0; index < require('./memory').db.blockchain.firstlast.all.length; index++) {
                        const _this_first_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(require('./memory').db.blockchain.firstlast.all[index].response.first)).digest(CONST_HASH_ENCODING);
                        const _this_last_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(require('./memory').db.blockchain.firstlast.all[index].response.last)).digest(CONST_HASH_ENCODING);
                        if (_this_first_hash !== _first_block_hash) { // for every peer where first block is different, blacklist(24h) and disconnect. not same chain.
                            require('../db/memory').db.blacklist.push({ server: require('./memory').db.blockchain.firstlast.all[index].server, port: require('./memory').db.blockchain.firstlast.all[index].port, date: Date.now() });
                            const _index_server = require('../db/memory').db.get.peer.index_server(require('./memory').db.blockchain.firstlast.all[index].server, require('./memory').db.blockchain.firstlast.all[index].port);
                            require('../db/memory').db.peers[_index_server].socket.disconnect();
                            require('./memory').db.blockchain.firstlast.all.splice(index, 1);
                            index--;
                        } else {
                            for (peer of require('../db/memory').db.default_peers) {
                                if ( (peer.server == require('./memory').db.blockchain.firstlast.all[index].server) && (peer.port == require('./memory').db.blockchain.firstlast.all[index].port) ) {
                                    if (require('./memory').db.blockchain.firstlast.trusted.length > 0) {
                                        if (require('./memory').db.blockchain.firstlast.trusted[0].response.last.block < require('./memory').db.blockchain.firstlast.all[index].response.last.block) {
                                            require('./memory').db.blockchain.firstlast.trusted[0] = require('./memory').db.blockchain.firstlast.all[index];
                                        }
                                    } else {
                                        require('./memory').db.blockchain.firstlast.trusted.push(require('./memory').db.blockchain.firstlast.all[index]);
                                    }
                                }
                            }
                            if (!require('./memory').db.blockchain.firstlast.grouped[_this_last_hash]) { require('./memory').db.blockchain.firstlast.grouped[_this_last_hash] = [] }
                            require('./memory').db.blockchain.firstlast.grouped[_this_last_hash].push(require('./memory').db.blockchain.firstlast.all[index]);
                        }
                    }
                    const _trusted_last_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(require('./memory').db.blockchain.firstlast.trusted[0].response.last)).digest(CONST_HASH_ENCODING);
                    console.log('\n\n  => Trusted last hash nodes list:');
                    console.log(require('./memory').db.blockchain.firstlast.grouped[_trusted_last_hash]);

                    if (require('./memory').db.blockchain.firstlast.grouped[_trusted_last_hash].length > 0) {
                        const _random_peer_firstlast = require('./memory').db.blockchain.firstlast.grouped[_trusted_last_hash].length > 1
                            ? require('./memory').db.blockchain.firstlast.grouped[_trusted_last_hash][require('node:crypto').randomInt(0, require('./memory').db.blockchain.firstlast.grouped[_trusted_last_hash].length-1)]
                            : require('./memory').db.blockchain.firstlast.grouped[_trusted_last_hash][0];

                        console.log(_random_peer_firstlast);
                        if (_last_block_hash != require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(_random_peer_firstlast.response.last)).digest(CONST_HASH_ENCODING)) {
                            
                            // full sync we'll see later for something partial
                            console.log(callback_data);
                            console.log('full sync');
                            for (let index = 1; index <= _last_block.block; index++) {
                                this.blockchain.remove({ block: index }).write();
                            }
                            const _data = { blockchain: 'get_block', block: 1, reason: 'full_sync', callback: 'sync_chain' };
                            const _peer_index = require('./memory').db.get.peer.index_server(_random_peer_firstlast.server, _random_peer_firstlast.port);
                            require('./memory').db.peers[_peer_index].socket.emit('data', await require('../../common/network').serialize(
                                require('./memory').db.server.uuid, require('./memory').db.server.openpgp, _data, require('./memory').db.peers[_peer_index].pub
                            ));

                        } else {
                            console.log('\n\n SYNC: last block is the same. done.')
                        }

                    }
                }
                break;
        
            default:
                break;
        }
    }
}

exports.verify_chain = (callback_data) => {
    const _last_block = this.blockchain.last().value();
    if (_last_block.block > 0) {
        for (let index = 1; index <= _last_block.block; index++) {
            const _block = this.blockchain.find({ block: index }).value();
            const _prev_block = this.blockchain.find({ block: index-1 }).value();
            const _prev_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(_prev_block)).digest('base64');
            if (_block.prev != _prev_hash) {
                console.log(`\n!! block ${_block.block} DOESN'T contain the good hash of the block ${_prev_block.block}`);
                if (callback_data && callback_data.callback) {
                    switch (callback_data.callback) {
                        case 'sync_chain':
                            this.sync_chain(Object.assign(callback_data, { verify: 'fail_at', block: index } ));
                            break;
                        default:
                            break;
                    }
                }
                break;
            }
        }
        console.log('\n  => Chain is verified !')
        if (callback_data && callback_data.callback) {
            switch (callback_data.callback) {
                case 'sync_chain':
                    this.sync_chain(Object.assign(callback_data, { verify: 'end_at', block: _last_block.block } ));
                    break;
                default:
                    break;
            }
        }
    }
}
