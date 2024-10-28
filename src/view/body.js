const socket = io('/web');
//
// https://github.com/indutny/elliptic https://safecurves.cr.yp.to/
const EC = elliptic.ec; // check to browserify only EC

socket.on('connect', function() {
    console.log('io connected')
})
