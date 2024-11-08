const path = require('node:path');
const fs = require('node:fs');
const DBFileSync = require('lowdb/adapters/FileSync');

const CONST_HASH = 'sha512';

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
    const _prev_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(_last_block)).digest('base64');
    const _block = { block: _last_block.block+1, data: data, prev: _prev_hash };
    this.blockchain.push(_block).write();
    return _block;
}

exports.new_block_from_node = (block) => {
    const _last_block = this.blockchain.last().value();
    const _last_block_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(_last_block)).digest('base64');
    if (_last_block_hash === block.prev) {
        this.blockchain.push(block).write();
    }
}

exports.sync_chain = async (at) => {
    console.log('SYNC CHAIN');
    for (peer of require('./memory').db.peers) { // maybe dont ask every peer
        if (peer.socket.connected) {
            const _data = { blockchain: 'get_firstlast', callback: 'sync_chain' };
            peer.socket.emit('data', await require('../common/network').serialize(
                require('./db/memory').db.server.uuid, require('./db/memory').db.server.openpgp, _data, peer.pub
            ));

        }
    }
}

exports.verify_chain = () => {
    const _last_block = this.blockchain.last().value();
    if (_last_block.block > 0) {
        let _init_sync_at = false;
        for (let index = 1; index <= _last_block.block; index++) {
            const _block = this.blockchain.find({ block: index }).value();
            const _prev_block = this.blockchain.find({ block: index-1 }).value();
            const _prev_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(_prev_block)).digest('base64');
            if (_block.prev != _prev_hash) {
                console.log(`\n!! block ${_block.block} DOESN'T contain the good hash of the block ${_prev_block.block}`);
                _init_sync_at = index;
                break;
            }
        }
        if (_init_sync_at) {
            this.sync_chain(_init_sync_at);
        }
    }
}
