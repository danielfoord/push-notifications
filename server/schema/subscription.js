const mongoose = require('mongoose');

const schema = mongoose.Schema({
  endpoint : { type: String, required: true },
  expirationTime: { type: Date },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true }
  }
});

const Subscription = mongoose.model('Subscription', schema);

module.exports = Subscription;