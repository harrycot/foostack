exports.config = {
    port_range: { start: 8001, end: 8010 },
    network: { ip: { v4: false, v6: false }, port: false },
    owner_pub: 'openpgp pub key'
}

exports.db = {
    state: { got_online_peers: false, is_blockchain_sync: false },
    server: { uuid: false, openpgp: false },
    default_peers: [],
    peers: [],
    webpeers: [],
    blockchain_firstlast: [],
    del: {
        peer: (index) => {
            this.db.peers.splice(index, 1);
        },
        webpeer: {
            index: (index) => {
                this.db.webpeers.splice(index, 1);
            },
            seens: (ms) => {
                for (let index = 0; index < this.db.webpeers.length; index++) {
                    if ( this.db.webpeers[index].seen <= Date.now() - ms ) {
                        this.db.webpeers.splice(index, 1);
                        index--;
                    }
                }
            },
            logins: (ms) => {
                for (let index = 0; index < this.db.webpeers.length; index++) {
                    if ( this.db.webpeers[index].login && this.db.webpeers[index].login.pub ) {
                        if ( this.db.webpeers[index].login.ask_login_data.issued <= Date.now() - ms ) {
                            this.db.webpeers[index].login = {}
                        }
                    }
                }
            }
        }
    },
    get: {
        peer: {
            index_uuid: (uuid, array) => {
                for (index in array) {
                    if (array[index].uuid === uuid) { return index }
                }
            },
            exist_uuid: (uuid, array) => {
                return array.filter(function(peer) { return peer.uuid === uuid }).length == 0 ? false : true;
            },
            index_sid: (sid, array) => {
                for (index in array) {
                    if (array[index].sid === sid) { return index }
                }
            },
            exist_sid: (sid, array) => {
                return array.filter(function(peer) { return peer.sid === sid }).length == 0 ? false : true;
            },
            exist_server: (server) => {
                return this.db.peers.filter((peer) => { return peer.server === server }).length == 0 ? false : true;
            },
            index_server: (server) => {
                for (index in this.db.peers) {
                    if (this.db.peers[index].server === server) { return index }
                }
            },
            onlines: () => {
                return this.db.peers.filter((peer) => { return peer.socket.connected }).map((peer) => { return peer.server });
            }
        }
    },
    set: {
        peer: (index, deserialized_handshake) => {
            if (!this.db.peers[index]) { this.db.peers[index] = {} }
            if (deserialized_handshake.server) { this.db.peers[index].server = deserialized_handshake.server }
            if (deserialized_handshake.sid) { this.db.peers[index].sid = deserialized_handshake.sid }
            if (deserialized_handshake.pub) { this.db.peers[index].pub = deserialized_handshake.pub }
            if (deserialized_handshake.uuid) { this.db.peers[index].uuid = deserialized_handshake.uuid }
            this.db.peers[index].seen = Date.now();
        },
        webpeer: (deserialized_handshake, socket_id) => { // think about a ttl like to delete seen > 1h
            if ( !this.db.get.peer.exist_uuid(deserialized_handshake.uuid, this.db.webpeers) ) { // overwrite at given index if uuid don't exist in peers
                this.db.webpeers.push({ pub: deserialized_handshake.pub, uuid: deserialized_handshake.uuid, sid: socket_id, seen: Date.now() });
            } else {
                this.db.webpeers[this.db.get.peer.index_uuid(deserialized_handshake.uuid, this.db.webpeers)].seen = Date.now();
            }
        }
    }
}

// this.db looks like this
// {
//     server: {
//       uuid: '0ccb69ee-ff89-4692-b29d-4cd939f59ace',
//       openpgp: {
//         priv: 'LS0tLS1CRUdJTiBQR1AgUFJJVkFURSBLRVkgQkxPQ0stLS0tLQoKeGNBWUJHY2c2UFVUQ1Nza0F3TUNDQUVCRFFRREJCR0YzVDlOOHR1NkY2QW52T2Q2cEs3SHY1ajJLdFlCCnNzbGkrSkRHdXZ3ZmxiK1o2dFFwNkJnQ0tOMlhhNlRiRUdCQ1QxT3VOL01JZDIxZUhHVTN1RE10amlkcwpnbU11TTNEUXl1TE1yeUprUmtnbjBrWHUzNlhHYmpwS1JPZmVqOVF4YXpJZEgzbGFad3Z3YXpCWU5jMkoKYzd2dXVyMTZkRnA4UkEyNXFYRk9BQUgrSkgyM09iZ09vNldOdE5WTFkvR3I3dU1PcjdIaXBaV0ZiazJ1CnVNN1dCdFoxU1U0QTVXTjdjbC9NZTFNd0prQzdRblprakowbTREK25tcVNWODUxNk9pSlN6VnN4TVdNMApOak01TnkwNE9XUTFMVFF3Tm1JdE9UWXpPQzAxTXpkaE56WTFNREV3TnpJZ1BHRmhZemsxTlRrNUxUaG0KWmpNdE5HSmhOQzFoT1RWa0xXWXdOekE1TURVM1ptUTFZVUJzYjJOaGJHaHZjM1F1Ykc5allXdyt3c0FNCkJCQVRDZ0ErQllKbklPajFCQXNKQndnSmtIcGJ1cnExVmtGQUF4VUlDZ1FXQUFJQkFoa0JBcHNEQWg0QgpGaUVFbnVSMENDUTExa2N0TVN3YWVsdTZ1clZXUVVBQUFDK3pBZ0NwQkV4dVlidzlKVTNQQjhiRTlhMzEKYS9GSGg0OXROT1pXb2dZV256U2ZnWVpQbkVEWHdsa1Z3eEd4TFNNei9tZTVaeFZnYzNvbUhDUjVSUVZIClpRK0hBZ0NwZWlIcnM1VnE5N2tyYkoxaXdaZFU5NkdwRHBXdGJQbktJT2ZxUWJDaW5zWG52a0JmVjZFRwpoemV0NWN6Ri93L1lFYUx0UXhOTmtXdUFvWCtQNXpLWXg4QWNCR2NnNlBVU0NTc2tBd01DQ0FFQkRRUUQKQkdGRGZraVJPVERudDF0N0Y4YWh5TnB4clAwNGp4Q3hhT20ycklvZVFlQUhicWlhVVdZMEwvZWlDY0k5CjczVUNRZjJZaXVENjdhS1RLckNpMWt6c3phb2ZtZ3Y3TWRSVWlpY0tsMHJsK3NmWWYxbjRaTEE1UEN4KwpqaEpJNHFGYjJMWEd5YU5qUFhEV1RIRmZFZDYvVWZmaVpUWEZlbWNYY1BsVVVOcTNPQTRxQXdFS0NRQUIKL2pTMlNXeXF5NnRwQnpWMklyU2NxcnNuWlpNMG5NRFJBVVQzY2dkVEtVbEQvTVdKc3FZTzAwL0dWS2lnCksydExodjgvTmxOeXUzM2llbDkvd3Ztb0Nkd2dlOEs0QkJnVENnQXFCWUpuSU9qMUNaQjZXN3E2dFZaQgpRQUtiREJZaEJKN2tkQWdrTmRaSExURXNHbnBidXJxMVZrRkFBQUFJd1FIK0tWR2dzT1E3dnpFazJsbU8KaFZrc2RJVThEQkVmQk02WjdzaVZvQmUyMTg4ZXVSdkJOcVI3c0cyNHBNRjZYZzJBMHR3YWU3aXVDRG1vCjJOQ2ZMMkxsSFFIL2FyL0d5OURHT2krODh4c0E2TjY1S3Q4ZzVBVExIaXhsU2dvNFd4LzZFTDNtQnBiSgpyUWQxVytpeUpXVlEwSXIra2RDTTFhWElPdzRxRXVQeEdUYWsvQT09Cj1iYlZoCi0tLS0tRU5EIFBHUCBQUklWQVRFIEtFWSBCTE9DSy0tLS0tCg==',
//         pub: 'LS0tLS1CRUdJTiBQR1AgUFVCTElDIEtFWSBCTE9DSy0tLS0tCgp4cE1FWnlEbzlSTUpLeVFEQXdJSUFRRU5CQU1FRVlYZFAwM3kyN29Yb0NlODUzcWtyc2UvbVBZcTFnR3kKeVdMNGtNYTYvQitWdjVucTFDbm9HQUlvM1pkcnBOc1FZRUpQVTY0Mzh3aDNiVjRjWlRlNE15Mk9KMnlDCll5NHpjTkRLNHN5dkltUkdTQ2ZTUmU3ZnBjWnVPa3BFNTk2UDFERnJNaDBmZVZwbkMvQnJNRmcxellsegp1KzY2dlhwMFdueEVEYm1wY1U3Tld6RXhZelEyTXprM0xUZzVaRFV0TkRBMllpMDVOak00TFRVek4yRTMKTmpVd01UQTNNaUE4WVdGak9UVTFPVGt0T0dabU15MDBZbUUwTFdFNU5XUXRaakEzTURrd05UZG1aRFZoClFHeHZZMkZzYUc5emRDNXNiMk5oYkQ3Q3dBd0VFQk1LQUQ0RmdtY2c2UFVFQ3drSENBbVFlbHU2dXJWVwpRVUFERlFnS0JCWUFBZ0VDR1FFQ213TUNIZ0VXSVFTZTVIUUlKRFhXUnkweExCcDZXN3E2dFZaQlFBQUEKTDdNQ0FLa0VURzVodkQwbFRjOEh4c1QxcmZWcjhVZUhqMjAwNWxhaUJoYWZOSitCaGsrY1FOZkNXUlhECkViRXRJelArWjdsbkZXQnplaVljSkhsRkJVZGxENGNDQUtsNklldXpsV3IzdVN0c25XTEJsMVQzb2FrTwpsYTFzK2NvZzUrcEJzS0tleGVlK1FGOVhvUWFITjYzbHpNWC9EOWdSb3UxREUwMlJhNENoZjQvbk1wak8KbHdSbklPajFFZ2tySkFNREFnZ0JBUTBFQXdSaFEzNUlrVGt3NTdkYmV4ZkdvY2phY2F6OU9JOFFzV2pwCnRxeUtIa0hnQjI2b21sRm1OQy8zb2duQ1BlOTFBa0g5bUlyZyt1MmlreXF3b3RaTTdNMnFINW9MK3pIVQpWSW9uQ3BkSzVmckgySDlaK0dTd09Ud3NmbzRTU09LaFc5aTF4c21qWXoxdzFreHhYeEhldjFIMzRtVTEKeFhwbkYzRDVWRkRhdHpnT0tnTUJDZ25DdUFRWUV3b0FLZ1dDWnlEbzlRbVFlbHU2dXJWV1FVQUNtd3dXCklRU2U1SFFJSkRYV1J5MHhMQnA2VzdxNnRWWkJRQUFBQ01FQi9pbFJvTERrTzc4eEpOcFpqb1ZaTEhTRgpQQXdSSHdUT21lN0lsYUFYdHRmUEhya2J3VGFrZTdCdHVLVEJlbDROZ05MY0dudTRyZ2c1cU5qUW55OWkKNVIwQi8ycS94c3ZReGpvdnZQTWJBT2pldVNyZklPUUV5eDRzWlVvS09Gc2YraEM5NWdhV3lhMEhkVnZvCnNpVmxVTkNLL3BIUWpOV2x5RHNPS2hMajhSazJwUHc9Cj0rSzNsCi0tLS0tRU5EIFBHUCBQVUJMSUMgS0VZIEJMT0NLLS0tLS0K',
//         revcert: 'LS0tLS1CRUdJTiBQR1AgUFVCTElDIEtFWSBCTE9DSy0tLS0tCkNvbW1lbnQ6IFRoaXMgaXMgYSByZXZvY2F0aW9uIGNlcnRpZmljYXRlCgp3cmdFSUJNS0FDb0ZnbWNnNlBVSmtIcGJ1cnExVmtGQUFwMEFGaUVFbnVSMENDUTExa2N0TVN3YWVsdTYKdXJWV1FVQUFBTmZDQWY5ZUhCbGRrMmhjV0tMT3lQVXMrZEp6UVc5QUNiSTlUZ2pTZTQ1d0V0NktVZVdqCmNEUmJYYUcyd3RELy9DR1VTc1JScDF0ZjlFUVhUc2w4ZS96bWd1TVdBZ0NCL1dIMm44ZnJSL1FZTnpjcgorcmRXR2lhMlZmS0tTbHpOZkwwQzVWK2d3OWt6cmc0cnB4LyttV09BOVdscUdOU0NLNUl2YmZMc3NwVTMKbFBvaWgvZjkKPXM1c3YKLS0tLS1FTkQgUEdQIFBVQkxJQyBLRVkgQkxPQ0stLS0tLQo='
//       }
//     },
//     peers: [
//       { server: 'localhost:8001', socket: [Socket] },
//       { server: 'localhost:8002', socket: [Socket] },
//       {
//         server: 'localhost:8003',
//         socket: [Socket],
//         openpgp: 'LS0tLS1CRUdJTiBQR1AgUFVCTElDIEtFWSBCTE9DSy0tLS0tCgp4cE1FWnlEbytSTUpLeVFEQXdJSUFRRU5CQU1Fbm8zY3dUVlUwaTZwQW5zeXAyN24wc2pUT2d6TkcrRTUKNWVMdFdUd1BPbC9LblBVcVRET043QjlwUit0cm9GcGpsQnhCT2ZVRjM3Rkp2eHRqNjRmZkdKczlJeUR5ClU0RFV1R3lscDlTbzlrNGdJbVkrQVV1OTdHRzN2M0NYU05POGJoS01LQlMzWFhPOEJVeHJuNGFBYmpaWAowSlc0dmVPQkZnbDB4YitYMVhITlcySmtOVE5pTm1NNExUazJPVGt0TkRKaE5DMDVaVE16TFdVMU1qYzQKWldVeFptWm1OQ0E4TkRZeU1qRXpPVE10WmpFeU5TMDBZbUkwTFRnM05tUXRNMkV5TWpreU5UWXpOemM1ClFHeHZZMkZzYUc5emRDNXNiMk5oYkQ3Q3dBd0VFQk1LQUQ0RmdtY2c2UGtFQ3drSENBbVFndVdxbitseApMZWNERlFnS0JCWUFBZ0VDR1FFQ213TUNIZ0VXSVFUQ3Bna05EdEQvZ0dJVGNRbUM1YXFmNlhFdDV3QUEKazJvQi9paVBoSGNiYThUTE11VU9NM0R1QlQ4MWpHbE1UQ0RBYVdUOTZ2dHhUcnYrd0VGUk01dEhtVGVsCmdJWGRNcFFBSVFkS2Nja0lRWEFLWFZUWFhqZUFoV29CL2p2MWl0ZUZVdXpWbnErQngrNFlvSjlBaFE4bwp3RTQ5SWdFdkFOcmVTWEkxR1VNYnNja2RVUUkzTjcyblFEZUhUVWFTUndvNkFTNVJ0RUlVQ0dNOG5Hbk8KbHdSbklPajVFZ2tySkFNREFnZ0JBUTBFQXdRdmNvVFdkOHlmajFDVHJ1V1hzVldYU2lTd3V1bm43UXlrCjJvTGgzcVA2QWQ5Tnh0aFBXN3NnNkNsT3p1K29wdWREcEZFSVVIRGZ4eHdzbWZ1RU5UTEdBMXRBcjAzYgpQbVBTQS8yS1RLeXlmTFFVRERMVzBpZmhhYUx0Q0VOOGtZVGhGTXFZRjVKQ3dMY2cxWHVzUVhHMjBaWmMKNnR4NEtGZUpVa2tEU1RydGhnTUJDZ25DdUFRWUV3b0FLZ1dDWnlEbytRbVFndVdxbitseExlY0Ntd3dXCklRVENwZ2tORHREL2dHSVRjUW1DNWFxZjZYRXQ1d0FBRCtFQi8xQngxVE9HMkV0Z3VSdGJKUlR0cTF6ZwpaVUJCU2VZd1k5dXZGVGQ3eVNmZEFHd2VyTGtRRC9ldCtIL3dkaWR0VlplamdKMVVlUWNSdVZoTi9GQmQKZGM4Q0FKY09FQXQvZjZRbFJJeE5PWTB1R2c4K0RRYnZrd3NjdTNKeTl6ak13MUk3QlZwTlY4UFcxdDhYCkVldGgxUW95OGkzb3hDZDlnK1NiMXptdkRZaW12UGs9Cj1RWWdGCi0tLS0tRU5EIFBHUCBQVUJMSUMgS0VZIEJMT0NLLS0tLS0K',
//         uuid: '83792dae-6122-481c-bd3e-45123a8ce88e',
//         seen: 1730210058342
//       },
//       {
//         server: 'localhost:8004',
//         socket: [Socket],
//         openpgp: 'LS0tLS1CRUdJTiBQR1AgUFVCTElDIEtFWSBCTE9DSy0tLS0tCgp4cE1FWnlEby9CTUpLeVFEQXdJSUFRRU5CQU1FUm9GZkF4em5hdDljSHdJNk5ia2FXcm5DUWZ6WFFKcTcKMTBSR1VKekg0dFpzMDJQTitFS0tLZUdYcVZRTSt1OEQzdnlzYUN4ZUFySCtUNnVtVUVPcG4wR2ZtdW1FCktPcDNBbHB1bTVKSGtkK2dKMm10S3lZUHpxZVpiRUdKV0VKUW43UjJDeXRFWlp3TUpXZlNkY0R2d3BPRAo4eGZ6QkRpWmQ2eCtlNXVLUHR2Tld6RTNObVV4TTJRM0xXRTJaR0l0TkRKbFl5MWhZemhqTFRSbVpqSTUKWkdaaE5EZzBNQ0E4T0Rnd1ltWTFOR010WldJelpDMDBPREEzTFdFNE9XWXRNRFEzWlRRMlpUZ3lPVEEzClFHeHZZMkZzYUc5emRDNXNiMk5oYkQ3Q3dBd0VFQk1LQUQ0RmdtY2c2UHdFQ3drSENBbVE2amQ5cGV6egoxR2NERlFnS0JCWUFBZ0VDR1FFQ213TUNIZ0VXSVFUZUxoWkxxWWJSYlZxajc2M3FOMzJsN1BQVVp3QUEKVEpzQi8weGpWYkVtamg5WHlKUjRVM3V0NVlaOGppMnYwdVNhR2VlQm9CQlBSWXVSYVYxRitDcGtQaXMyCm5SL1BINHNOQ0ZuYWRZQzNOb3NmdmxISVJPR1B4TzBCL2pNcHQ4aS9nY2U2Mk1YTVFET0ZYN1BUU2lBdwpkY2M3QVZaYUkyQ0xoZTR2K0J2czdjeFFxTHpFRDg3enREa0YwbU5qcWU0cVRoaTBwOWg3ZGJLTGlJSE8KbHdSbklPajhFZ2tySkFNREFnZ0JBUTBFQXdTaVY3Tk5rVkNqU0hUVm4yRTIrTUY0MGRZQjdIQ2tRUTQ2Cmk4bGl1WE1wdWNFTnpBbm9CSy9oc25zQ05GL3djaXJGeU9pOHBoUTFPSFIrOWd4ZkprenpmVTNKSGlJSwp6cC9YTzBHalpZT0pucG95WFNPek9OUnZkdy8xT09LODBZZVkyeUcyb3hQU0NUTnFkOW51bTAyWkVwVjkKQVZCc2dLTi9ROXVjaGlJenBnTUJDZ25DdUFRWUV3b0FLZ1dDWnlEby9BbVE2amQ5cGV6ejFHY0Ntd3dXCklRVGVMaFpMcVliUmJWcWo3NjNxTjMybDdQUFVad0FBc084Qi8xdmtoR3JRNTNCMzN4KzhMMEFublFqaApCcFNReTYrMm1adDJRY3FKQlhnaVVJMk4yUU5naUhXcERJRWlHaldzeGF4Y0FMdzdwN1N0MkpoSit1L0wKV3VNQ0FJRGhZQ0pHSWpSSGNYK25ZUlFsd2VVbjFLeDJXUTVpR1o3dnlLS3p6L2g2NCtTQjFOR2VlK2cvCmYxejhXTy9pZlMwMDkzWjFpK1JneDlBVHFlN29HUUE9Cj1BYnp6Ci0tLS0tRU5EIFBHUCBQVUJMSUMgS0VZIEJMT0NLLS0tLS0K',
//         uuid: '31d5d4c0-8a46-4625-b187-96085655245e',
//         seen: 1730210058397
//       },
//       {
//         server: 'localhost:8005',
//         socket: [Socket],
//         openpgp: 'LS0tLS1CRUdJTiBQR1AgUFVCTElDIEtFWSBCTE9DSy0tLS0tCgp4cE1FWnlEby94TUpLeVFEQXdJSUFRRU5CQU1FR0FDVEJ6Tyt0OUQyYkFGNGd6OXBJR2xnYzdwZnU3SjIKS3FpVE9XQkdORVMwaXJsclVqeG1uYXljcExzM0dFUlJnYVBEMWhtY1RXYjFsWWxRYjF4cDhoVTBDTWhLCkROcXphazc4NFpGeVc0TjU0ZUMvcFpiZDdHT1U2TmFtRmtuWGhSclpHcS9UQXNDTDJvcVdydjFVWUtrNgppdkloWUp4T2tvUDBDL1IxNFQzTlcySm1ObVEzTldJNExUZ3pZekF0Tkdaa1ppMWhaamd4TFRjMVpqTm0KWmpBNE5EUTFOQ0E4TTJWbU9URmhZakl0TURsbVl5MDBPVFJrTFRsaE5EVXRPV0ZtWWpaaU5XUTFZV1prClFHeHZZMkZzYUc5emRDNXNiMk5oYkQ3Q3dBd0VFQk1LQUQ0RmdtY2c2UDhFQ3drSENBbVF3djZkYUR0dwo2bTBERlFnS0JCWUFBZ0VDR1FFQ213TUNIZ0VXSVFUOC93M3VPTUhOcnE3VmdKdkMvcDFvTzNEcWJRQUEKWmQwQi8wWXFmV1lDdENxRjJsc003bzMxbUNUcThrR0g5S0JuR3B3NVJPMGZLMkpQbyswT3VCc3FoRHFjClp0UEQ5YnVyR1o5dHJPclorZDBPU25zYUViUm9CaTRCL1J0aFZDR29aSG1vb0h4YWxYc1grelZwNTJJSQpTamdqYWlTQk1STkFBTWg5eTZFZndpenRFRWlVNVE0SDQ5VEd6czBpLzJMYUd5VnZlZU1hSkZxTGQ2SE8KbHdSbklPai9FZ2tySkFNREFnZ0JBUTBFQXdTaWNNZVE0UDI2K2VWRC8rUG54U243eWs4TFcxbTVaNW5CCjFpMGdIQUE2VWhGOXdGc0prRFJnc25FWEVBTU1VbGNQOUtxZEtCZVNRdlF2YW4xcThzYUZMYzAwUGhnWAp2UHJManJVQ04xaitqQ3FkTHVtcDRucC9uS2daNjQrdzJncytZNkNURDBCelduMGFuQ091ZUVMMUVGeXUKamg4YnBFRFVkRU1nazVscjVBTUJDZ25DdUFRWUV3b0FLZ1dDWnlEby93bVF3djZkYUR0dzZtMENtd3dXCklRVDgvdzN1T01ITnJxN1ZnSnZDL3Axb08zRHFiUUFBUnRNQi8yNldaZGppa01oQ0FRRWVjdU94RFBIUAptUFhSTW5RazFIQUFVK3IzZ1Z6T0plY0NBVGFGK3E3ZVFwaGRVcVpHRVlFWnRwWmRjM3ZZZDY0ckdDb2EKUVNrQi9Sc002dmxmZzkwckh0UnBBeGZpWlNGR1UrdHoray8xRnJZYzBxYVdpZmg4MUxDTk1wK2IzYm02CkY4dkp2MDF3MXNNOXFnbCtHZUUxQVQzb0pwSjVCUXc9Cj1SSTRlCi0tLS0tRU5EIFBHUCBQVUJMSUMgS0VZIEJMT0NLLS0tLS0K',
//         uuid: 'c066f035-9167-49b1-a8cb-ca40ed4e6b3f',
//         seen: 1730210058418
//       },
//       { server: 'localhost:8006', socket: [Socket] },
//       { server: 'localhost:8007', socket: [Socket] },
//       { server: 'localhost:8008', socket: [Socket] },
//       { server: 'localhost:8009', socket: [Socket] },
//       { server: 'localhost:8010', socket: [Socket] }
//     ],
//     webpeers: [
//       {
//         openpgp: 'LS0tLS1CRUdJTiBQR1AgUFVCTElDIEtFWSBCTE9DSy0tLS0tCgp4cE1FWnlaQ1BoTUpLeVFEQXdJSUFRRU5CQU1FaXFsZFZUOHp4eGduUVpHc3N2SlhrWnFSQ0luWmNQS2MKY1F5cS9WNzNWM2Nsa1dMRFdLVWM5OTZ2c3MrYUJ1WHNZUGR2SndXMzZZZC9rNTZQZ1MxSEVRTm1UOW02CkdQeHc3VnN0T1FXbXZQeEtTcEVrbURtM05PMCtIcW15ckFodVNjS2FyTFh1NGdwQjJCMG9HZDJyZGJZagpBdmFVbnRFaVQ1WFpsaHZGNWYzTkZuUmxjM1FnUEhSbGMzUkFkR1Z6ZEM1c2IyTmhiRDdDd0F3RUVCTUsKQUQ0RmdtY21RajRFQ3drSENBbVFhNVB1Rm05YmMrRURGUWdLQkJZQUFnRUNHUUVDbXdNQ0hnRVdJUVQwCjMrNGRvWWhiQUx2OG1CNXJrKzRXYjF0ejRRQUFWZmNCL1JkTGxpY3UwWGMvVjRhWC9NaFVTbVRGcXpDRgpubWxZRVRMTWtsY0VKTDhxOGNqaVU4NUlNNkt0NVFJV2NxUWd3TjZFSURzNjEvbC9qYmlTTFhkWU1uNEIKL1JITVNnUFQyeTE4VVdUTDExTmxOWmJuTnRPeS9NWlAzTFF3SVFwRHlrN29YQWZ1aXFwL25udkd6VllJCmcyUWZrVXJneEF5WGhDMTJkYUVtYVNuemNoek9sd1JuSmtJK0Vna3JKQU1EQWdnQkFRMEVBd1J0YVdLbwptSzgyazNKTWlKL2VldG9lZ2poOGZSbGUyc1M3T1NaamJ4VkRrRGFVUHFXMWE0Z1QzZjZ6OG9Mc3JNQ3YKUk9RVDRldXhqNHVyeWNZbmwxaEdXalU4UUtpNm5LamtJQlV3ZFdXWGxPZjU0MVMwNDdRenBWY05MZmZTCnFOcVdlUThJdVU4OStzejZaMFJ4RERLWHE1b25SQkxMMUdlOC90MG15NGFhdmdNQkNnbkN1QVFZRXdvQQpLZ1dDWnlaQ1BnbVFhNVB1Rm05YmMrRUNtd3dXSVFUMDMrNGRvWWhiQUx2OG1CNXJrKzRXYjF0ejRRQUEKRFd3Qi9pS3dUUEJHSUVWdi9tZXRSR3NEemp2LzRQbXJzK2prUkdXOUw1QTIvUDFPOEp3dlJhRUVKL1d1CjF1UktIM0g5blB5WC9OdzZYL1BTMGUyWEIrOVNOa3NCLzBRdGRkZHJqajJrdU5VMDBvTWNXZlhrblNzZQpncnZoT2Z0Q2ZwMEpONCt4OHMvR3NzTk9hTWRPaTQ0SzZqajNvT0hFbkE2eVdETE5hT0RDUTNXRmVRbz0KPWdxZUoKLS0tLS1FTkQgUEdQIFBVQkxJQyBLRVkgQkxPQ0stLS0tLQo=',
//         uuid: '048e4cbe-f3b3-4a53-8a51-7c555d1472dc',
//         seen: 1730560590635
//       }
//     ],
//     get: { peer: { index: [Function: index], exist: [Function: exist] } },
//     set: { peer: [Function: peer], webpeer: [Function: webpeer] }
// }