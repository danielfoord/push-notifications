const consola = require('consola');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const webpush = require('web-push');
const MongoClient = require('mongodb').MongoClient;

consola.level = 4;

//mongodb://myAppUser:myAppPassword@mongo1:27017,mongo2:27017/myAppDatabase?replicaSet=rs0
const mongoUrl = 'mongodb://localhost:37017';
const dbName = 'push-notification';
let pushDb;

(async () => {
  
  try {
    let mongoClient = await MongoClient.connect(mongoUrl);
    consola.success(`Connected successfully to mongodb on ${mongoUrl}`);
    pushDb = mongoClient.db(dbName);
  } catch (err) {
    consola.error(err);
  }
  
  const publicKey = 'BEDv9fBpsXPKORdMXDBRSwPlWfBQaEcl0k1llKLfDBMUWRX66Yp-dOQbB84AfDBXHfugiq0fcRe74NC6McajhHo';
  const privateKey = 'IqKGZq_Jh2v-akSpafAp6c4p5N8GXOEXL7rFqtyMESs';
  
  webpush.setVapidDetails(
    'http://localhost:3000',
    publicKey,
    privateKey
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
  
    const subscription = req.body.subscription;
  
    // TODO: Validate subscription
  
    try {
      await pushDb.collection('subscription').insertOne(subscription);
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
  
    const subscription = req.body.subscription;
  
    // TODO: Validate subscription
    
    try {
      await pushDb.collection('subscription').removeOne({ 
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
  
    const subscription = JSON.parse(req.body.subscription);
    const title = req.body.title;
    const body = req.body.body;
    const url = req.body.url;
   
    consola.info(`Forwarding message to ${subscription.endpoint}`);
    
    try {
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
        await pushDb.collection('subscription').removeOne({ 
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
  
  app.listen(3000, () => consola.start('Web push app server listening on port 3000'));
})();