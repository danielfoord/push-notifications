'use strict';

const _pushButton = document.querySelector('#btn-toggle-push');
const _sendButton = document.querySelector('#btn-send');
const _txtRecipientSubscription = document.querySelector('#txt-subscription');
const _txtTitle = document.querySelector('#txt-title');
const _txtBody = document.querySelector('#txt-body');
const _txtUrl = document.querySelector('#txt-url');
const _snackbar = document.querySelector('#snackbar');

let _isSubscribed = false;
let _swRegistration = null;
let _isPushSupported = 'serviceWorker' in navigator && 'PushManager' in window;

class PushApi {

  async getPublicKey() {
    return await fetch('/vapidPublicKey');
  }

  async subscribe(subscription) {
    await fetch('/subscribe', {
      method: 'post',
      headers: {
        'Content-type': 'application/json'
      },
      body: JSON.stringify({ subscription })
    });
  }

  async unsubscribe(subscription) {
    await fetch('/unsubscribe', {
      method: 'post',
      headers: {
        'Content-type': 'application/json'
      },
      body: JSON.stringify({ subscription })
    });
  }

  async sendMessage(message) {
    await fetch('/message', {
      method: 'post',
      headers: {
        'Content-type': 'application/json'
      },
      body: JSON.stringify({
        subscription: message.subscription,
        title: message.title,
        body: message.body,
        url: message.url
      }),
    });
  }

}

const _pushApi = new PushApi();

(async () => {
  if (_isPushSupported) {

    console.debug('Service Worker and Push is supported');
  
    try {
      
      _swRegistration = await navigator.serviceWorker.register('sw.js');
      console.debug('Service Worker is registered', _swRegistration);

      navigator.serviceWorker.addEventListener('message', (event) => {
        let payload = event.data;
        let data = {
          message: payload.body,
          timeout: 2000
        };
        _snackbar.MaterialSnackbar.showSnackbar(data);
      });

      initializeUI();

    } catch(err) {
      console.err(err);
    }
   
  } else {
    console.warn('Push messaging is not supported');
    _pushButton.textContent = 'Push Not Supported';
    _pushButton.disabled = true;
  }
})();

async function initializeUI() {
  _pushButton.addEventListener('click', function() {
    _pushButton.disabled = true;
    if (_isSubscribed) {
      unsubscribeUser();
    } else {
      subscribeUser();
    }
  });

  _sendButton.addEventListener('click', async function() {
    _sendButton.disabled = true;
    await _pushApi.sendMessage({
      subscription: _txtRecipientSubscription.value,
      title: _txtTitle.value,
      body: _txtBody.value,
      url: _txtUrl.value
    });
    _sendButton.disabled = false;
  });

  // Set the initial subscription value
  let subscription = await _swRegistration.pushManager.getSubscription();
  _isSubscribed = subscription !== null;
  updateUI(subscription);
  updateBtn();

  _isSubscribed ? 
  console.debug('User is subscribed.') : 
  console.debug('User is not subscribed.');

}

function updateBtn() {
  if (Notification.permission === 'denied') {
    _pushButton.textContent = 'Push Messaging Blocked.';
    _pushButton.disabled = true;
    updateUI(null);
    return;
  }

  if (_isSubscribed) {
    _pushButton.textContent = 'Disable Push Messaging';
  } else {
    _pushButton.textContent = 'Enable Push Messaging';
  }

  _pushButton.disabled = false;
}

function updateUI(subscription) {
  const subscriptionJson = document.querySelector('.js-subscription-json');
  const subscriptionDetails = document.querySelector('.js-subscription-details');

  if (subscription) {
    subscriptionJson.textContent = JSON.stringify(subscription, null, 2);
    subscriptionDetails.classList.remove('is-invisible');
  } else {
    subscriptionDetails.classList.add('is-invisible');
  }
}

async function subscribeUser() {

  let subscription = await _swRegistration.pushManager.getSubscription();
  _isSubscribed = subscription !== null;
  
  if (!_isSubscribed) {
    
    const pubKeyRes = await _pushApi.getPublicKey();
    const publicKey = await pubKeyRes.text();
    const applicationServerKey = urlB64ToUint8Array(publicKey);

    try {
      
      subscription = await _swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      console.debug('User is subscribed.');

      await _pushApi.subscribe(subscription);

      updateUI(subscription);     
      _isSubscribed = true;
      updateBtn();

    } catch(err) {
      console.error('Failed to subscribe the user: ', err);
      updateBtn();
    }

  } 

}

async function unsubscribeUser() {
  
  const subscription = await _swRegistration.pushManager.getSubscription();
  
  try {
    if (subscription) {
      await _pushApi.unsubscribe(subscription);
      await subscription.unsubscribe();
    }
  } catch (err) {
    console.error('Error unsubscribing', err);
  } finally {
    _isSubscribed = false;
    updateUI(null);
    console.debug('User is unsubscribed.');
    updateBtn();
  }

}

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