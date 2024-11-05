// here functions to manage file as blockchain

const { blockchain } = require('../server').db;


exports.init = () => {
    //blockchain.push({ block: 0, data: '', prev: false }).write();
    
    for (let index = 0; index < 10; index++) {
        const _last_block = blockchain.takeRight(1).value();
        const _prev_hash = require('node:crypto').createHash('sha256').update(JSON.stringify(_last_block)).digest('hex');
        blockchain.push({ block: _last_block[0].block+1, data: '', prev: _prev_hash }).write()
    }
}
