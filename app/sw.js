'use strict';

self.addEventListener('push', async (event) => {
    
  const hasData = !!event.data;
  var payload = JSON.parse(event.data.text());
  
  console.debug(event);
  console.debug('[Service Worker] Push Received.');
  
  if (hasData) {
    console.debug(`[Service Worker] Push had this data: "${JSON.stringify(payload, null, 2)}"`);
  } else {
    console.debug(`[Service Worker] Push had no data`);
  }

  let options;
  let title = hasData ? payload.title : 'Web Push';
  let body = hasData ? payload.body : 'Oops, no data';
  let icon = 'images/icon.png';
  let badge = 'images/badge.png';
  let actions = [{ action: 'open', title: 'Open' }];
  let data = payload.url;

  options = {
    body,
    icon,
    badge,
    actions,
    data
  };

  let clients = await self.clients.matchAll();
  if(clients.length === 0) {
    await self.clients.claim();
    clients = await self.clients.matchAll(); 
  }

  console.debug(clients, clients.length);

  let forwardIfFocused = (client, payload) => {
    if(client.focused) {
      client.postMessage(payload);
    }
  };

  clients.forEach(client => forwardIfFocused(client, payload));
  let noneFocused = !clients.find(client => client.focused);
  if(noneFocused) {
    await self.registration.showNotification(title, options);
  }

});

self.addEventListener('notificationclick', async (event) => {
  console.debug('[Service Worker] Notification click Received.');
  event.notification.close();
  console.debug(event.notification);
  await clients.openWindow(event.notification.data);
});