'use strict';

const pushButton = document.querySelector('#btn-toggle-push');
const sendButton = document.querySelector('#btn-send');
const txtRecipientSubscription = document.querySelector('#txt-subscription');
const txtTitle = document.querySelector('#txt-title');
const txtBody = document.querySelector('#txt-body');
const txtUrl = document.querySelector('#txt-url');


let isSubscribed = false;
let swRegistration = null;

navigator.serviceWorker.addEventListener('message', event => {
  console.log('Got message from sw', event);
});

function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

if ('serviceWorker' in navigator && 'PushManager' in window) {
  console.debug('Service Worker and Push is supported');

  navigator.serviceWorker.register('sw.js')
  .then(function(swReg) {
    console.debug('Service Worker is registered', swReg);

    swRegistration = swReg;
    initializeUI();
  })
  .catch(function(error) {
    console.error('Service Worker Error', error);
  });
} else {
  console.warn('Push messaging is not supported');
  pushButton.textContent = 'Push Not Supported';
  pushButton.disabled = true;
}

function initializeUI() {
  pushButton.addEventListener('click', function() {
    pushButton.disabled = true;
    if (isSubscribed) {
      unsubscribeUser();
    } else {
      subscribeUser();
    }
  });

  sendButton.addEventListener('click', async function() {
    sendButton.disabled = true;
    await fetch('/message', {
      method: 'post',
      headers: {
        'Content-type': 'application/json'
      },
      body: JSON.stringify({
        subscription: txtRecipientSubscription.value,
        title: txtTitle.value,
        body: txtBody.value,
        url: txtUrl.value
      }),
    });
    sendButton.disabled = false;
  });

  // Set the initial subscription value
  swRegistration.pushManager.getSubscription()
  .then(function(subscription) {
    isSubscribed = !(subscription === null);

    updateUI(subscription);

    if (isSubscribed) {
      console.debug('User is subscribed.');
    } else {
      console.debug('User is not subscribed.');
    }

    updateBtn();
  });
}

function updateBtn() {
  if (Notification.permission === 'denied') {
    pushButton.textContent = 'Push Messaging Blocked.';
    pushButton.disabled = true;
    updateUI(null);
    return;
  }

  if (isSubscribed) {
    pushButton.textContent = 'Disable Push Messaging';
  } else {
    pushButton.textContent = 'Enable Push Messaging';
  }

  pushButton.disabled = false;
}

async function updateUI(subscription) {
  const subscriptionJson = document.querySelector('.js-subscription-json');
  const subscriptionDetails =
    document.querySelector('.js-subscription-details');

  if (subscription) {
    subscriptionJson.textContent = JSON.stringify(subscription, null, 2);
    subscriptionDetails.classList.remove('is-invisible');
  } else {
    subscriptionDetails.classList.add('is-invisible');
  }
}

async function subscribeUser() {
  return swRegistration.pushManager.getSubscription()
  .then(async function(subscription) {
    isSubscribed = !(subscription === null);
    if (!isSubscribed) {
      const pubKeyRes = await fetch('/vapidPublicKey');
      const publicKey = await pubKeyRes.text();
      const applicationServerKey = urlB64ToUint8Array(publicKey);
      return swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      })
      .then(async function(subscription) {
        
        console.debug('User is subscribed.');

        await fetch('/subscribe', {
          method: 'post',
          headers: {
            'Content-type': 'application/json'
          },
          body: JSON.stringify({
            subscription: subscription
          })
        });

        updateUI(subscription);

       
        isSubscribed = true;
        updateBtn();
      })
      .catch(function(err) {
        console.error('Failed to subscribe the user: ', err);
        updateBtn();
      });
    } 
  });
}

function unsubscribeUser() {
  swRegistration.pushManager.getSubscription()
  .then(async function(subscription) {
    if (subscription) {
      
      await fetch('/unsubscribe', {
        method: 'post',
        headers: {
          'Content-type': 'application/json'
        },
        body: JSON.stringify({
          subscription: subscription
        })
      });


      return subscription.unsubscribe();
    }
  })
  .catch(function(error) {
    console.error('Error unsubscribing', error);
  })
  .then(async function() {
    updateUI(null);
    console.debug('User is unsubscribed.');
    isSubscribed = false;
    updateBtn();
  });
}