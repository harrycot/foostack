//const delete_webpeers

exports.init = () => {
    setTimeout(() => { // 1 min
        console.log('\n==== RUNNING CRON 1 MIN ====\n');
        
    }, 60 * 1000); // 1 min


    setTimeout(() => { // 10 min
        console.log('\n==== RUNNING CRON 10 MIN ====\n');
        // delete webpeers if peer was seen >= 1h
        const _webpeer_list = require('../db/memory').db.webpeers.filter(function(webpeer) { return webpeer.seen <= Date.now() - (3600 * 1000) });
        let _webpeer_list_indexes = [];
        for(webpeer of _webpeer_list){
            const _index = require('../db/memory').db.get.peer.index_uuid(webpeer.uuid, require('../db/memory').db.webpeers);
            _webpeer_list_indexes.push(_index);
        }
        for(index of _webpeer_list_indexes.reverse()){
            require('../db/memory').db.del.webpeer(index);
        }
    }, 600 * 1000); // 10 min


    setTimeout(() => { // 1h
        console.log('\n==== RUNNING CRON 1 HOUR ====\n');

    }, 3600 * 1000); // 1h
}