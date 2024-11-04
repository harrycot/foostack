const CONST_1M = 60 * 1000;
const CONST_1H = 60 * CONST_1M;
const CONST_1D = 24 * CONST_1H;

exports.init = () => {
    setInterval(() => { // 1 min
        console.log('\n==== RUNNING CRON 1 MIN ====\n');
        
    }, CONST_1M); // 1 min


    setInterval(() => { // 10 min
        console.log('\n==== RUNNING CRON 10 MIN ====\n');
        require('../db/memory').db.del.webpeer.seens(30*CONST_1M); // seen >= 30 min (remove peer)
        require('../db/memory').db.del.webpeer.logins(4*CONST_1H); // login >= 4h (logout but dont remove peer)

    }, 10 * CONST_1M); // 10 min


    setInterval(() => { // 1h
        console.log('\n==== RUNNING CRON 1 HOUR ====\n');

    }, CONST_1H); // 1h


    setInterval(() => { // 1d
        console.log('\n==== RUNNING CRON 1 DAY ====\n');

    }, CONST_1D); // 1d
}