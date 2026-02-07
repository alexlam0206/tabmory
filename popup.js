const outputEl = document.getElementById('output');
const refreshBtn = document.getElementById('refreshBtn');
const breadcrumbsEl = document.getElementById('breadcrumbs');

function setOutput(value) {
  outputEl.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function renderBreadcrumbs(relationships) {
  breadcrumbsEl.textContent = '';

  const parentKeys = new Set(Object.keys(relationships || {}));
  const parentOf = {};
  const childNodes = new Set();

  Object.keys(relationships || {}).forEach((parentId) => {
    const children = relationships[parentId] || [];
    children.forEach((childId) => {
      const childKey = String(childId);
      childNodes.add(childKey);
      parentOf[childKey] = String(parentId);
    });
  });

  let leaves = Array.from(childNodes).filter((id) => !parentKeys.has(id));
  if (leaves.length === 0) {
    leaves = Array.from(parentKeys);
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

    const text = path.join(' > ');
    if (seen.has(text)) return;
    seen.add(text);

    const li = document.createElement('li');
    li.textContent = text;
    breadcrumbsEl.appendChild(li);
  });
}

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
      renderBreadcrumbs(response.relationships);
      setOutput(response.relationships);
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
