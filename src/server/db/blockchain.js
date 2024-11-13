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
    this.blockchain = require('lowdb')(new DBFileSync(path.join(cwd, `_blockchain/${port}/blockchain.json`), { defaultValue: [{ block: 0, data: "", prev: "false" }] }));
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
                const _data = { blockchain: 'get_firstlast', callback: 'sync_chain' };
                peer.socket.emit('data', await require('../../common/network').serialize(
                    require('./memory').db.server.uuid, require('./memory').db.server.openpgp, _data, peer.pub
                ));
            }
        }
        setTimeout(() => {
            // remove timeout
            for (let index = 0; index < require('../db/memory').db.blockchain.firstlast.all.length; index++) {
                if (!require('./memory').db.blockchain.firstlast.all[index].response) {
                    require('./memory').db.blockchain.firstlast.all.splice(index, 1);
                    index--;
                }
            }
            this.sync_chain({ blockchain: 'get_firstlast', timeout: true });
        }, require('../db/memory').timeout.got_blockchain_firstlast);
    } else {
        // { blockchain: 'get_firstlast', first_last: { first: x, last: x }, server: 'IP:PORT' };
        switch (callback_data.blockchain) {
            case 'get_block':
                const _last_block = this.blockchain.last().value();
                const _last_block_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(_last_block)).digest(CONST_HASH_ENCODING);
                if (_last_block_hash === callback_data.response.prev) {
                    this.blockchain.push(callback_data.response).write(); // write the new block
                } else { // ask get -1
                    this.blockchain.remove({ block: _last_block.block }).write();
                }

                if (callback_data.response.prev !== '') { // call from verify_chain
                    require('./memory').db.blockchain.saved_responses[callback_data.response.block] = callback_data;
                }
                for (let index = 0; index < Object.keys(require('./memory').db.blockchain.saved_responses).length; index++) {
                    const _last_block_now = this.blockchain.last().value();
                    if (require('./memory').db.blockchain.saved_responses[_last_block_now.block+1] && !this.blockchain.find({ block: _last_block_now.block+1 }).value()) {
                        this.blockchain.push(require('./memory').db.blockchain.saved_responses[_last_block_now.block+1].response).write(); // write saved block
                        // delete require('./memory').db.blockchain.saved_responses[_last_block.block+1];
                    }
                }

                const _data = _last_block_hash === callback_data.response.prev
                    ? { blockchain: 'get_block', block: this.blockchain.last().value().block+1, callback: 'sync_chain' }
                    : { blockchain: 'get_block', block: _last_block.block, callback: 'sync_chain' };

                if (require('./memory').db.blockchain.firstlast.trusted[0].response.last.block != callback_data.response.block) {
                    const _trusted_last_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(require('./memory').db.blockchain.firstlast.trusted[0].response.last)).digest(CONST_HASH_ENCODING);
                    const _random_peer_firstlast = require('./memory').db.blockchain.firstlast.grouped[_trusted_last_hash].length > 1
                        ? require('./memory').db.blockchain.firstlast.grouped[_trusted_last_hash][require('node:crypto').randomInt(0, (require('./memory').db.blockchain.firstlast.grouped[_trusted_last_hash].length) )]
                        : require('./memory').db.blockchain.firstlast.grouped[_trusted_last_hash][0];

                    const _peer_index = require('./memory').db.get.peer.index_server(_random_peer_firstlast.server, _random_peer_firstlast.port);
                    require('./memory').db.peers[_peer_index].socket.emit('data', await require('../../common/network').serialize(
                        require('./memory').db.server.uuid, require('./memory').db.server.openpgp, _data, require('./memory').db.peers[_peer_index].pub
                    ));
                } else {
                    //console.log(require('./memory').db.blockchain.saved_responses);
                    //console.log(require('./memory').db.blockchain.firstlast.grouped[_trusted_last_hash].length);
                    console.log('\n\n Full sync done !');
                    require('./memory').db.blockchain.firstlast = { all: [], trusted: [], grouped: {} }; // reset firstlast
                    require('./memory').db.blockchain.saved_responses = {}; // reset saved responses
                    this.verify_chain();
                }
                break;
            case 'get_firstlast':
                if (!callback_data.timeout) { require('./memory').db.blockchain.firstlast.all.push(callback_data) }

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
                    console.log(callback_data);
                    //console.log(require('./memory').db.blockchain.firstlast);
                    const _trusted_last_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(require('./memory').db.blockchain.firstlast.trusted[0].response.last)).digest(CONST_HASH_ENCODING);
                    console.log('\n\n  => Trusted last hash nodes list:');
                    console.log(require('./memory').db.blockchain.firstlast.grouped[_trusted_last_hash]);

                    //

                    if (require('./memory').db.blockchain.firstlast.grouped[_trusted_last_hash].length > 0) {
                        const _random_peer_firstlast = require('./memory').db.blockchain.firstlast.grouped[_trusted_last_hash].length > 1
                            ? require('./memory').db.blockchain.firstlast.grouped[_trusted_last_hash][require('node:crypto').randomInt(0, require('./memory').db.blockchain.firstlast.grouped[_trusted_last_hash].length)]
                            : require('./memory').db.blockchain.firstlast.grouped[_trusted_last_hash][0];

                        if (_last_block_hash != require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(_random_peer_firstlast.response.last)).digest(CONST_HASH_ENCODING)) {
                            
                            const _data = _last_block.block < _random_peer_firstlast.response.last.block
                                ? { blockchain: 'get_block', block: _last_block.block+1, callback: 'sync_chain' }
                                : { blockchain: 'get_block', block: _random_peer_firstlast.response.last.block, callback: 'sync_chain' };
                            
                            if (_last_block.block > _random_peer_firstlast.response.last.block) { // if full remove every block before except block 0
                                for (let index = _random_peer_firstlast.response.last.block; index <= _last_block.block; index++) {
                                    this.blockchain.remove({ block: index }).write();
                                }
                            }
                            const _peer_index = require('./memory').db.get.peer.index_server(_random_peer_firstlast.server, _random_peer_firstlast.port);
                            require('./memory').db.peers[_peer_index].socket.emit('data', await require('../../common/network').serialize(
                                require('./memory').db.server.uuid, require('./memory').db.server.openpgp, _data, require('./memory').db.peers[_peer_index].pub
                            ));
                        } else {
                            this.verify_chain();
                        }

                    }


                    //


                }
                break;
        
            default:
                break;
        }
    }
}

//don't try to verify chain until firstlast array done inside sync_chain function
exports.verify_chain = () => {
    const _last_block = this.blockchain.last().value();
    if (_last_block.block > 0) {
        for (let index = 1; index <= _last_block.block; index++) {
            const _block = this.blockchain.find({ block: index }).value();
            const _prev_block = this.blockchain.find({ block: index-1 }).value();
            const _prev_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(_prev_block)).digest('base64');
            if (!_block || (_block.prev != _prev_hash)) {
                for (let i = index; i <= _last_block.block; i++) {
                    this.blockchain.remove({ block: i }).write();
                }
                if (require('./memory').db.blockchain.firstlast.all.length > 0) {
                    this.sync_chain({ blockchain: 'get_block', callback: 'sync_chain', block: !_block ? index : index-1, response: { block: !_block ? index : index-1, prev: '' } });
                } else {
                    this.sync_chain();
                }
                break;
            }
        }
        console.log('\n  => Chain is verified !');
        require('./memory').db.state.is_blockchain_sync = false;
    }
}
