const consola = require('consola');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const webpush = require('web-push');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Subscription = require('./server/schema/subscription');

consola.level = 4;

dotenv.load();

if (!process.env.HTTP_PORT) {
  throw new Error('HTTP_PORT environment variable needs to be defined')
  process.exit(1);
}

if (!process.env.VAPID_PUBLIC_KEY) {
  throw new Error('VAPID_PUBLIC_KEY environment variable needs to be defined')
  process.exit(1);
}

if (!process.env.VAPID_PRIVATE_KEY) {
  throw new Error('VAPID_PRIVATE_KEY environment variable needs to be defined')
  process.exit(1);
}

if (!process.env.MONGODB_CONNSTRING) {
  throw new Error('MONGODB_CONNSTRING environment variable needs to be defined')
  process.exit(1);
}

async function openDbConnection(mongoUrl) {
  return new Promise((resolve, reject) => {
    mongoose.connect(mongoUrl).catch(reject);
    let db = mongoose.connection;
    db.once('open', () => resolve(db));
  });
}

(async () => {
  
  try {
    //mongodb://myAppUser:myAppPassword@mongo1:27017,mongo2:27017/myAppDatabase?replicaSet=rs0
    const mongoUrl = process.env.MONGODB_CONNSTRING;
    consola.info(`Connecting to mongodb on ${mongoUrl}`);
    await openDbConnection(mongoUrl);
    consola.success(`Connected successfully to mongodb on ${mongoUrl}`);
  } catch(err) {
    consola.error(err);
    process.exit(1);
  }
  
  webpush.setVapidDetails(
    'http://localhost:3000',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  
  app.use(express.static('app'));
  
  app.use(bodyParser.json());
  
  app.get('/vapidPublicKey', (_req, res) => {
    consola.info('Got public key request');
    res.end(publicKey);
  });
  
  app.post('/subscribe', async (req, res) => {
  
    consola.info('Got subscribe request');
    consola.debug(JSON.stringify(req.body, null, 2));

    try {
      
      const payload = req.body.subscription;

      const subscription = new Subscription({
        endpoint: payload.endpoint,
        expirationTime: payload.expirationTime,
        keys: {
          p256dh: payload.keys.p256dh,
          auth: payload.keys.auth,
        }
      });

      // TODO: Validate subscription
      
      await subscription.save();
      res.status(201);
    } catch (err) {
      consola.error(err);
      consola.debug(err);
      res.status(500);
    } finally {
      res.end();
    }

  });
  
  app.post('/unsubscribe', async (req, res) => {
    consola.info('Got unsubscribe request');
    consola.debug(JSON.stringify(req.body, null, 2));

    try {
      
      const subscription = req.body.subscription;
      
      // TODO: Validate subscription

      await Subscription.deleteOne({ 
        endpoint: subscription.endpoint 
      });

      res.status(200);

    } catch (err) {
      consola.error(err);
      consola.debug(err);
      res.status(500);
    } finally {
      res.end();
    }

  });
  
  app.post('/message', async (req, res) => {
    
    consola.info('Got message request');
    consola.debug(JSON.stringify(req.body, null, 2));
  
    try {

      const subscription = JSON.parse(req.body.subscription);
      const title = req.body.title;
      const body = req.body.body;
      const url = req.body.url;
     
      consola.info(`Forwarding message to ${subscription.endpoint}`);

      await webpush.sendNotification(subscription, JSON.stringify({
        title,
        body,
        url
      }));
      
      consola.success('Message sent');
      
      res.status(201);

    } catch (err) {
      
      res.status(500);
      
      // Make sure that we have no reference to an unregistered subscription 
      if (err.statusCode === 410) {
        res.status(400);
        consola.warn('Trying to push to an unregistered subscription');
        await Subscription.deleteOne({ 
          endpoint: subscription.endpoint 
        });
      } else {
        consola.error(err);
        console.debug(err);
      }

    } finally {
      res.end();
    }
  
  });
  
  app.listen(process.env.HTTP_PORT, () => consola.start('Web push app server listening on port 3000'));
  
})();
