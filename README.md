When you start multiple instances of this project ``` npm run dev ``` you will see first that each server making an "handshake" (exchange of uuid, ecdsa(pub) and ecdh(pub)).
Currently, when you type a string in the stdin of an instance, you can see the replication across others sending acknowlegment to the emitter.

The key exchange contain: uuid, signature(uuid), ecdsa(pub), ecdh(pub) with a computed hmac at the end.
The exchanged data contain : data, signature(data), uuid, signature(uuid) with a computed hmac at the end.

The acknowledgement is going to be used as data verification.