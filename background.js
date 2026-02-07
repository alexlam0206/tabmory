console.log('--- BACKGROUND SERVICE WORKER LOADED ---');

let parentToChildren = {};

chrome.storage.local.get(['tabRelationships'], (result) => {
  if (result.tabRelationships) {
    parentToChildren = result.tabRelationships;
    console.log('Relationships loaded from storage:', parentToChildren);
  } else {
    console.log('No relationships found in storage.');
  }
});

chrome.tabs.onCreated.addListener((tab) => {
  console.log('--- Tab Created Event ---');
  
  if (tab.openerTabId) {
    if (!parentToChildren[tab.openerTabId]) {
      parentToChildren[tab.openerTabId] = [];
    }
    parentToChildren[tab.openerTabId].push(tab.id);

    chrome.storage.local.set({ tabRelationships: parentToChildren }, () => {
      console.log('Data saved to storage:', parentToChildren);
    });
  }

  console.log('Current Map:', parentToChildren);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'log') {
    console.log('Background received:', request.message);
    sendResponse({ ok: true });
    return;
  }

  if (request.action === 'getTabRelationships') {
    console.log('Background received request: getTabRelationships');
    chrome.storage.local.get(['tabRelationships'], (result) => {
      if (chrome.runtime.lastError) {
        console.log('Background storage get error:', chrome.runtime.lastError.message);
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }

      const relationships = result.tabRelationships || {};
      console.log('Background responding with relationships:', relationships);
      sendResponse({ ok: true, relationships });
    });
    return true;
  }
});
