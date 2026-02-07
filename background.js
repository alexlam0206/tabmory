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
    const parentId = String(tab.openerTabId);
    const childId = String(tab.id);

    if (!parentToChildren[parentId]) {
      parentToChildren[parentId] = [];
    }
    parentToChildren[parentId].push(childId);

    chrome.storage.local.set({ tabRelationships: parentToChildren }, () => {
      console.log('Data saved to storage:', parentToChildren);
    });
  }

  console.log('Current Map:', parentToChildren);
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  const removedId = String(tabId);
  console.log('--- Tab Removed Event ---');
  console.log('Removed Tab ID:', removedId);
  console.log('Remove Info:', removeInfo);

  let changed = false;

  if (parentToChildren[removedId]) {
    delete parentToChildren[removedId];
    changed = true;
  }

  Object.keys(parentToChildren).forEach((parentId) => {
    const children = Array.isArray(parentToChildren[parentId]) ? parentToChildren[parentId] : [];
    const filtered = children.map(String).filter((childId) => childId !== removedId);
    if (filtered.length !== children.length) changed = true;
    if (filtered.length === 0) {
      delete parentToChildren[parentId];
      changed = true;
    } else {
      parentToChildren[parentId] = filtered;
    }
  });

  if (!changed) {
    console.log('No relationship changes needed.');
    return;
  }

  chrome.storage.local.set({ tabRelationships: parentToChildren }, () => {
    console.log('Relationships cleaned after removal:', parentToChildren);
  });
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
