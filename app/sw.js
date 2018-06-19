'use strict';

self.addEventListener('push', async function(event) {
  console.debug(event);

  console.debug('[Service Worker] Push Received.');
  if (event.data) {
    console.debug(`[Service Worker] Push had this data: "${event.data.text()}"`);
  } else {
    console.debug(`[Service Worker] Push had no data`);
  }

  var options;
  var title = 'Web Push';

  if (event.data) {
    var notification = JSON.parse(event.data.text());
    title = notification.title;
    options = {
      body: notification.body,
      icon: 'images/icon.png',
      badge: 'images/badge.png',
      actions: [
        { action: 'open', title: 'Open' }
      ],
      data: {
        url: notification.url
      }
    };
  } else {
     options = {
      body: 'Oops, no data',
      icon: 'images/icon.png',
      badge: 'images/badge.png',
      actions: [
        { action: 'open', title: 'Open' }
      ]
    };
  }
  console.log(self.clients);
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  console.debug('[Service Worker] Notification click Received.');
  event.notification.close();
  console.debug(event.notification);
  event.waitUntil(
    clients.openWindow('http://placekitten.com/1024/768')
  );
});

self.addEventListener('message', function(event){
  console.log("SW Received Message: " + event.data);
});
