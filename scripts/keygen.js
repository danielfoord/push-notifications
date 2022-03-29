const crypto = require('crypto');
const base64url = require('base64url');

const ecdh = crypto.createECDH('prime256v1');
ecdh.generateKeys();

const pubKey = ecdh.getPublicKey('base64');
const priKey = ecdh.getPrivateKey('base64');

const pubKeyUrl = base64url.fromBase64(pubKey);
const priKeyUrl = base64url.fromBase64(priKey);

console.log(`Public key URL: ${pubKeyUrl}`);
console.log(`Public key: ${pubKey}`);
console.log(`\nPrivate key URL: ${priKeyUrl}`);
console.log(`Private key: ${priKey}`);
