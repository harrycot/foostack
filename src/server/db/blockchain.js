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
                require('./memory').db.blockchain_firstlast.push(_data);
                peer.socket.emit('data', await require('../../common/network').serialize(
                    require('./memory').db.server.uuid, require('./memory').db.server.openpgp, _data, peer.pub
                ));
            }
        }
        setTimeout(() => { // 10s
            // remove timeout
            for (let index = 0; index < require('../db/memory').db.blockchain_firstlast.length; index++) {
                if (!require('./memory').db.blockchain_firstlast[index].response) {
                    require('./memory').db.blockchain_firstlast.splice(index, 1);
                    index--;
                }
            }
            this.sync_chain({ blockchain: 'get_firstlast', timeout: true });
        }, 10*1000); // 10s
    } else {
        // { blockchain: 'get_firstlast', first_last: { first: x, last: x }, server: 'IP:PORT' };
        switch (callback_data.blockchain) {
            case 'get_firstlast':
                for (let index = 0; index < require('../db/memory').db.blockchain_firstlast.length; index++) {
                    if (require('./memory').db.blockchain_firstlast[index].server === callback_data.server
                        && require('./memory').db.blockchain_firstlast[index].port === callback_data.port) {
                            require('./memory').db.blockchain_firstlast[index].response = callback_data.response;
                    }
                }

                if (callback_data.timeout) { // on timeout do
                    console.log('\n\n  => blockchain firstlast array done:');
                    console.log(require('./memory').db.blockchain_firstlast);

                    const _first_block = this.blockchain.first().value();
                    const _first_block_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(_first_block)).digest(CONST_HASH_ENCODING);
                    const _last_block = this.blockchain.last().value();
                    const _last_block_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(_last_block)).digest(CONST_HASH_ENCODING);

                    const _grouped = {};
                    for (let index = 0; index < require('./memory').db.blockchain_firstlast.length; index++) {
                        const _this_first_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(require('./memory').db.blockchain_firstlast[index].response.first)).digest(CONST_HASH_ENCODING);
                        const _this_last_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(require('./memory').db.blockchain_firstlast[index].response.last)).digest(CONST_HASH_ENCODING);
                        if (_this_first_hash !== _first_block_hash) { // for every peer where first block is different, blacklist(24h) and disconnect. not same chain.
                            require('../db/memory').db.blacklist.push({ server: require('./memory').db.blockchain_firstlast[index].server, port: require('./memory').db.blockchain_firstlast[index].port, date: Date.now() });
                            const _index_server = require('../db/memory').db.get.peer.index_server(require('./memory').db.blockchain_firstlast[index].server, require('./memory').db.blockchain_firstlast[index].port);
                            require('../db/memory').db.peers[_index_server].socket.disconnect();
                            require('./memory').db.blockchain_firstlast.splice(index, 1);
                            index--;
                        } else {
                            if (!_grouped[_this_last_hash]) { _grouped[_this_last_hash] = [] }
                            _grouped[_this_last_hash].push(require('./memory').db.blockchain_firstlast[index]);
                        }
                    }
                    const _grouped_hashes = [];
                    const _grouped_length = [];
                    for (hash in _grouped) {
                        _grouped_hashes.push(hash);
                        _grouped_length.push(_grouped[hash].length);
                    }                     // return _grouped[ where _grouped_hashes at index of (max of _grouped_length) ]
                    const _last_majority = _grouped[_grouped_hashes[_grouped_length.indexOf(Math.max(..._grouped_length))]];
                    console.log(_last_majority);

                    if (_last_majority.length > 0) {
                        const _random_peer_firstlast = _last_majority[require('node:crypto').randomInt(0, _last_majority.length-1)];
                        if (_last_block_hash != require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(_random_peer_firstlast.response.last)).digest(CONST_HASH_ENCODING)) {
                            if (callback_data.at) {
                                const _index_server = require('../db/memory').db.get.peer.index_server(_random_peer_firstlast.server, _random_peer_firstlast.port);
                                console.log(callback_data);
                                // require('../db/memory').db.peers[_index_server].socket.emit('data', await require('../../common/network').serialize(
                                //     require('./memory').db.server.uuid, require('./memory').db.server.openpgp, _data, require('../db/memory').db.peers[_index_server].pub
                                // ));
                            } else {
                                this.verify_chain(Object.assign(callback_data, { callback: 'sync_chain' }));
                            }
                        } else {
                            console.log('\n\n SYNC: last block is the same. done.')
                        }

                    }

                    // trust the majority
                    // end try to sync with a random peer
                }
                //
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
                            this.sync_chain(Object.assign(callback_data, { at: index }));
                            break;
                        default:
                            break;
                    }
                }
                break;
            }
        }
        if (callback_data && callback_data.callback) {
            switch (callback_data.callback) {
                case 'sync_chain':
                    this.sync_chain(Object.assign(callback_data, { at: _last_block.block }));
                    break;
                default:
                    break;
            }
        }
    }
}
