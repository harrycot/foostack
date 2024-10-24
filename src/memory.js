exports.config = {
    is_production: process.pkg ? true : false,
    port_range: process.pkg ? { start: 443, end: 443} : { start: 8001, end: 8010 },
    network: { ipv4: false, ipv6: false, port: false }
}

exports.db = {
    server: { uuid: false, keys: { ecdsa: false, ecdh: false }, socket: false },
    peers: [],
    get: {
        peer: {
            index: (uuid) => {
                for (index in this.db.peers) {
                    if (this.db.peers[index].uuid == uuid) { return index }
                }
            },
            exist: (uuid) => {
                return this.db.peers.filter(function(peer) { return peer.uuid === uuid }).length == 0 ? false : true;
            }
        }
    },
    set: {
        peer: (index, deserialized_handshake) => {
            if ( !this.db.get.peer.exist(deserialized_handshake.uuid) && index ) {
                this.db.peers[index].uuid = deserialized_handshake.uuid;
                this.db.peers[index].ecdh = deserialized_handshake.ecdh;
                this.db.peers[index].ecdsa = deserialized_handshake.ecdsa;
                this.db.peers[index].seen = Date.now();
            } else if ( this.db.get.peer.exist(deserialized_handshake.uuid) ) {
                this.db.peers[this.db.get.peer.index(deserialized_handshake.uuid)].seen = Date.now();
            }
        }
    }
}


// this.db looks like this
// {
//     server: {
//         uuid: '53844d47-bf96-493f-9733-eca66867d4f5',
//         keys: { ecdsa: [Object], ecdh: [Object] },
//         socket: [Socket]
//     },
//     peers: [
//         {
//         server: 'localhost:8001',
//         socket: [Socket],
//         uuid: '19f61cf3-6342-4c7c-9363-4f103bf4d654',
//         ecdh: 'BAHTg/QzcAhotqnGA07ldLODiW96c0vzVDLVTqNHQg/Z9Uir8cvW/Hi6MUsz+ee9VfbdBlwc5Lu91XMxmuv64nhTbwAKqSLoPCabR8Pn4mT7XuyKvquTFOTf/9GdVVJnJZMlihXVCdtPqxTWnsGmtPlGHG3q/xRtEP47RE+kEYJlXUIu5Q==',
//         ecdsa: 'MFIwEAYHKoZIzj0CAQYFK4EEAAMDPgAEJE8pR84jLbeo9uV1Rzj75rh0hZIW89kh1aTjshn2Ej1EnSTYkNcJB0k4DPmTRhw9ovwB5sS8Wf4Ujgam',
//         seen: 1729687751796
//         },
//         {
//         server: 'localhost:8002',
//         socket: [Socket],
//         uuid: 'e1f8efe2-625b-4bc7-b2ba-d9c87d601a8c',
//         ecdh: 'BACdbUU8g3YfS7+pCdfWQ5P8YuE5tAzTQoMT5Dspk9vpxSPzuhBKIxuCzt2OSRXaGAAIZ8yiHGY04jwGj1LFtiOl6wCKULRTcGHMV9g6q69RcYYAPfV5mtdsLxFQ1nnORXuh233sVwNgEMeD0ZiQ3iK0ZV+JK9ZRIEaelO8rTnizBmUZQQ==',
//         ecdsa: 'MFIwEAYHKoZIzj0CAQYFK4EEAAMDPgAEMo4vyV6r7jopmILm+/vSbjb4+6HHbN2uvi0H6mfuF6pAWPWRDJeE96QssuP454tzKVWh1pzOp3HOveDv',
//         seen: 1729687750591
//         },
//         {
//         server: 'localhost:8003',
//         socket: [Socket],
//         uuid: 'c4ba08b7-ea9b-4919-9451-fcaddb1bec4d',
//         ecdh: 'BACZUbrZxO+4S+3Rmq4xiP5zkSmqSZoESiivjJGohKgb1XLcAiRjv1QGBB/BywplDNbZheltzMjO6vTRggls9NdCdQDg7bh4666EI0zhsWyEC3pUv/kzIzSOPee1FdKzMQng7YH7YqZgciWGgz10iYcSh5trclR+vW0pjSvIUD0vwRfEFQ==',
//         ecdsa: 'MFIwEAYHKoZIzj0CAQYFK4EEAAMDPgAEEET2pJm6MJzoILyk3ig2fif0aNO/+kJ4BG3cm2DNb7TcLuN5oO/fIUgY5K/nt4XhFZy972ld/1qJ/3GK',
//         seen: 1729687751404
//         },
//         {
//         server: 'localhost:8004',
//         socket: [Socket],
//         uuid: '524b9058-8f2e-4b8e-8e09-fc438acd4b36',
//         ecdh: 'BACfiDw9aaOrh+t/bY+pezzrdaETqoAniYM1kcB+hpoacfKmsyLTK+eaoNHraAOxlvTBKAdsxHRSq07t4XSqQe2uwQDJr5peNJTH65mm8uq600RoAT2kga3task6fxDzCTAYnliVs6rtfVRQtKkPyrLwu6ngYvBumQcR63YKGB+CNGCBow==',
//         ecdsa: 'MFIwEAYHKoZIzj0CAQYFK4EEAAMDPgAEDfm7pEvLLbllg0VtigdaHsk4usa7WNfTemO9MLu3IBa/NbARbu/UtqCqW5/xVJzWdYzxPF5O8yHS5zrF',
//         seen: 1729687748885
//         },
//         { server: 'localhost:8005', socket: [Socket] },
//         { server: 'localhost:8006', socket: [Socket] },
//         { server: 'localhost:8007', socket: [Socket] },
//         { server: 'localhost:8008', socket: [Socket] },
//         { server: 'localhost:8009', socket: [Socket] },
//         { server: 'localhost:8010', socket: [Socket] }
//     ],
//     get: { peer: { index: [Function: index], exist: [Function: exist] } },
//     set: { peer: [Function: peer] }
// }
  