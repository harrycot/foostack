// here functions to manage file as blockchain
const CONST_HASH = 'sha512';

const { blockchain } = require('../server').db;


exports.init = () => {    
    this.verify_chain();

    
}

exports.new_block = (data) => {
    const _last_block = blockchain.last().value();
    const _prev_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(_last_block)).digest('base64');
    const _block = { block: _last_block.block+1, data: data, prev: _prev_hash };
    blockchain.push(_block).write();
    return _block;
}

exports.new_block_from_node = (block) => {
    const _last_block = blockchain.last().value();
    const _last_block_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(_last_block)).digest('base64');
    if (_last_block_hash === block.prev) {
        blockchain.push(block).write();
    }
}

exports.verify_chain = () => {
    const _last_block = blockchain.last().value();
    if (_last_block.block > 0) {
        for (let index = 1; index <= _last_block.block; index++) {
            const _block = blockchain.find({ block: index }).value();
            const _prev_block = blockchain.find({ block: index-1 }).value();
            const _prev_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(_prev_block)).digest('base64');
            if (_block.prev != _prev_hash) {
                console.log(`\n!! block ${_block.block} DOESN'T contain the good hash of the block ${_prev_block.block}`);
            }
        }
    }
}
