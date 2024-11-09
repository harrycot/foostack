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

exports.sync_chain = async (callback_data) => {
    if ( !callback_data && !require('./memory').db.state.is_blockchain_sync ) {
        console.log('\n SYNC CHAIN\n');
        require('./memory').db.state.is_blockchain_sync = true;
        for (peer of require('./memory').db.peers) { // maybe dont ask every peer
            if (peer.socket.connected) {
                const _data = { blockchain: 'get_firstlast', callback: 'sync_chain' };
                require('./memory').db.blockchain_firstlast.push( { server: peer.server } );
                peer.socket.emit('data', await require('../../common/network').serialize(
                    require('./memory').db.server.uuid, require('./memory').db.server.openpgp, _data, peer.pub
                ));
            }
        }
        setTimeout(() => { // 10s
            // remove timeout
            for (let index = 0; index < require('../db/memory').db.blockchain_firstlast.length; index++) {
                if (!require('./memory').db.blockchain_firstlast[index].first_last) {
                    require('./memory').db.blockchain_firstlast.splice(index, 1);
                    index--;
                }
            }
            this.sync_chain({ blockchain: 'get_firstlast' });
            
        }, 10*1000); // 10s
    } else {
        // { blockchain: 'get_firstlast', first_last: { first: x, last: x }, server: 'IP:PORT' };
        switch (callback_data.blockchain) {
            case 'get_firstlast':
                for (let index = 0; index < require('../db/memory').db.blockchain_firstlast.length; index++) {
                    if (require('./memory').db.blockchain_firstlast[index].server === callback_data.server) {
                        require('./memory').db.blockchain_firstlast[index].first_last = callback_data.first_last;
                    }
                }

                if (require('./memory').db.blockchain_firstlast.filter((el) => { return el.first_last }).length == require('./memory').db.blockchain_firstlast.length) {
                    
                    // entering twice here (timeout).
                    console.log('\n\n  => blockchain firstlast array done:');
                    console.log(require('./memory').db.blockchain_firstlast);

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
