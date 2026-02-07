const outputEl = document.getElementById('output');
const refreshBtn = document.getElementById('refreshBtn');
const breadcrumbsEl = document.getElementById('breadcrumbs');

function setOutput(value) {
  outputEl.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function fetchCurrentTabInfo(cb) {
  chrome.tabs.query({}, (tabs) => {
    if (chrome.runtime.lastError) {
      console.log('Popup chrome.tabs.query lastError:', chrome.runtime.lastError.message);
      cb({}, {});
      return;
    }

    const titleById = {};
    const windowIdById = {};
    const existingById = {};

    (tabs || []).forEach((tab) => {
      const id = tab && tab.id != null ? String(tab.id) : null;
      if (!id) return;
      existingById[id] = true;
      const title = tab && typeof tab.title === 'string' ? tab.title.trim() : '';
      if (title) titleById[id] = title;
      if (tab && typeof tab.windowId === 'number') windowIdById[id] = tab.windowId;
    });

    console.log('Popup current tabs count:', (tabs || []).length);
    cb(titleById, windowIdById, existingById);
  });
}

function renderBreadcrumbsWithTitles(relationships, titleById, existingById) {
  const label = (id) => titleById[String(id)] || 'Missing title';

  breadcrumbsEl.textContent = '';

  const parentKeys = new Set(Object.keys(relationships || {}).map(String));
  const parentOf = {};
  const childNodes = new Set();

  Object.keys(relationships || {}).forEach((parentId) => {
    const parentKey = String(parentId);
    if (!existingById[parentKey]) return;
    const children = relationships[parentId] || [];
    children.forEach((childId) => {
      const childKey = String(childId);
      if (!existingById[childKey]) return;
      childNodes.add(childKey);
      parentOf[childKey] = parentKey;
    });
  });

  let leaves = Array.from(childNodes).filter((id) => !parentKeys.has(id));
  if (leaves.length === 0) {
    leaves = Array.from(parentKeys).filter((id) => existingById[id]);
  }

  if (leaves.length === 0) {
    const li = document.createElement('li');
    li.textContent = '(empty)';
    breadcrumbsEl.appendChild(li);
    return;
  }

  const seen = new Set();

  leaves.forEach((leafId) => {
    const path = [];
    let current = String(leafId);
    const guard = new Set();

    while (current && !guard.has(current)) {
      guard.add(current);
      path.unshift(current);
      current = parentOf[current];
    }

    const li = document.createElement('li');
    const key = path.join('>');
    if (seen.has(key)) return;
    seen.add(key);

    path.forEach((id, idx) => {
      if (idx > 0) li.appendChild(document.createTextNode(' > '));
      const a = document.createElement('a');
      a.href = '#';
      a.dataset.tabId = String(id);
      a.textContent = label(id);
      li.appendChild(a);
    });
    breadcrumbsEl.appendChild(li);
  });
}

function focusTab(tabId) {
  const numericId = Number(tabId);
  if (!Number.isFinite(numericId)) return;

  chrome.tabs.get(numericId, (tab) => {
    if (chrome.runtime.lastError) {
      console.log('Popup chrome.tabs.get lastError:', chrome.runtime.lastError.message);
      setOutput(chrome.runtime.lastError.message);
      return;
    }
    if (!tab) return;

    chrome.tabs.update(numericId, { active: true }, () => {
      if (chrome.runtime.lastError) {
        console.log('Popup chrome.tabs.update lastError:', chrome.runtime.lastError.message);
      }
    });

    if (typeof tab.windowId === 'number') {
      chrome.windows.update(tab.windowId, { focused: true }, () => {
        if (chrome.runtime.lastError) {
          console.log('Popup chrome.windows.update lastError:', chrome.runtime.lastError.message);
        }
      });
    }
  });
}

breadcrumbsEl.addEventListener('click', (e) => {
  const link = e.target && e.target.closest ? e.target.closest('a[data-tab-id]') : null;
  if (!link) return;
  e.preventDefault();
  const tabId = link.dataset.tabId;
  console.log('Popup focusing tab:', tabId);
  focusTab(tabId);
});

function requestRelationships() {
  console.log('Popup requesting relationships...');
  chrome.runtime.sendMessage({ action: 'getTabRelationships' }, (response) => {
    if (chrome.runtime.lastError) {
      console.log('Popup lastError:', chrome.runtime.lastError.message);
      setOutput(`Error: ${chrome.runtime.lastError.message}`);
      return;
    }
    console.log('Popup received response:', response);
    if (response && response.ok) {
      const relationships = response.relationships || {};
      fetchCurrentTabInfo((titleById, windowIdById, existingById) => {
        console.log('Popup titleById keys:', Object.keys(titleById).length);
        renderBreadcrumbsWithTitles(relationships, titleById, existingById);
        setOutput('');
      });
      return;
    }
    setOutput(response);
  });
}

refreshBtn.addEventListener('click', () => {
  console.log('Popup refresh clicked');
  requestRelationships();
});

requestRelationships();
