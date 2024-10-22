

exports.is_production = process.pkg ? true : false;
exports.allowed_port_range = process.pkg ? { start: 443, end: 443} : { start: 8001, end: 8010 };
exports.network_details = { ip4: false, ip6: false, port: false };

exports.server_data = { uuid: false, keys: { ecdsa: false, ecdh: false }, peers: [], socket: false };

exports.is_peer_exist_by_uuid = (uuid) => {
    return this.server_data.peers.filter(function(peer) { return peer.uuid === uuid }).length == 0 ? false : true;
}
exports.get_peer_index_by_uuid = (uuid) => {
    for (index in this.server_data.peers) {
        if (this.server_data.peers[index].uuid == uuid) { return index }
    }
}

// server_data:
// {
//     uuid: '0763ccd2-61fb-4754-b5f1-f768e91005ea',
//     keys: {
//       ecdsa: {
//         priv: 'MIHsMFcGCSqGSIb3DQEFDTBKMCkGCSqGSIb3DQEFDDAcBAjekstWhFY7pAICCAAwDAYIKoZIhvcNAgkFADAdBglghkgBZQMEASoEEB9ftBdT5UXOsDT8313Em2UEgZDKFgPKkyFmb374qLoNU161lumB3p3iIbzo/UrN5VVbngxfMipf7oOy2kWOpWj5/sKJ/Ovfr2KAb1IavwU4l3z7G8TW0duAOGTXDukfTrA87cwlTVhvAlDwICsEdn1FcnAohn2GmSQ7I6qhMI9p840nYsRz/ao0WEMjJk+2EBewrOky1qGncpegkdxQ6ACoRxs=',
//         pub: 'MFIwEAYHKoZIzj0CAQYFK4EEAAMDPgAEHKzan8BstlkdB0vZrUuvK5LdJ602d3JbKc8dBtPreko2CAHIkSvSXoj9JRJn4n42fRmrD69vWfI6HJBa'
//       },
//       ecdh: {
//         priv: 'mv7ishODM2jSBTCj4WvCKyQO5IrPVUXNklt7FMoHOEt/BQbcrrJIaZMaiL0yqqsGrYouEA2IL0o3Sal7KgfUWpk=',
//         pub: 'BAFtzbEw6Jx37XYF3T0BvyVeG5H8aQ/Pkh1XBgfF/Oh/ry0U0koc+Xk1nnjJePOgnOAtXL0nkSmlPgOqvbNHPAMo6gEHooLJdxgCpzLji81fQ7SbTgoFVQ5BS4/pSeZEYxykvkQKCEAnunpNYrYw3iuH+rjOTFTYlSfAGNmPDLwJj1EWlw=='
//       }
//     },
//     peers: [
//       { server: 'localhost:8001', socket: [Socket] },
//       {
//         server: 'localhost:8002',
//         socket: [Socket],
//         uuid: 'e9a5a4d8-81ee-4e45-aa9a-10fdb794f34c',
//         ecdh: 'BAENAbmB+K7l6fx7ID7ft+z1aoAgSamXqmjhPyt2gjSxeiEDnb80PedyJJEDvpfeA9fe4ulI5Ht3x38u5O9zWr/kKQDukSK7Y9XaHsu2KBf6vwB0cJkFSC8pU9f+cKYI3Wz66rhYuOsfNpvaeYVGK+OUHWq7AS8u1n2ejdkkfKFw7qwZIA==',
//         ecdsa: 'MFIwEAYHKoZIzj0CAQYFK4EEAAMDPgAEb2SbP3CytBoqLIqsPwWHRmMxON4cj9Cu1ODmTvUwcXW7QKC4voz1r33MdbMSftRjO/54Q3oemcT3+Npb',
//         seen: 1729612842365
//       },
//       { server: 'localhost:8003', socket: [Socket] },
//       { server: 'localhost:8004', socket: [Socket] },
//       { server: 'localhost:8005', socket: [Socket] },
//       { server: 'localhost:8006', socket: [Socket] },
//       { server: 'localhost:8007', socket: [Socket] },
//       { server: 'localhost:8008', socket: [Socket] },
//       { server: 'localhost:8009', socket: [Socket] },
//       { server: 'localhost:8010', socket: [Socket] }
//     ],
//     socket: [Socket]
// }
  