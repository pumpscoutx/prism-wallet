// Background script for Prism Wallet
chrome.runtime.onInstalled.addListener(() => {
  console.log('Prism Wallet installed');
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.windows.create({
    url: chrome.runtime.getURL('index.html'),
    type: 'popup',
    width: 360,
    height: 600
  });
});

// Message handling between content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_STORAGE') {
    chrome.storage.local.get(request.keys, (result) => {
      sendResponse(result);
    });
    return true;
  }
  
  if (request.type === 'SET_STORAGE') {
    chrome.storage.local.set(request.data, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});