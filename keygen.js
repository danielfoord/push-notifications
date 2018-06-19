const crypto = require('crypto');
const base64url = require('base64url');

const ecdh = crypto.createECDH('prime256v1');
ecdh.generateKeys();

console.log(`Public key URL: ${base64url.fromBase64(ecdh.getPublicKey('base64'))}`);
console.log(`Public key: ${ecdh.getPublicKey('base64')}`);
console.log(`\nPrivate key URL: ${base64url.fromBase64(ecdh.getPrivateKey('base64'))}`);
console.log(`Private key: ${ecdh.getPrivateKey('base64')}`);
