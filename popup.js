const outputEl = document.getElementById('output');
const refreshBtn = document.getElementById('refreshBtn');

function setOutput(value) {
  outputEl.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
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
    setOutput(response);
  });
}

refreshBtn.addEventListener('click', () => {
  console.log('Popup refresh clicked');
  requestRelationships();
});

requestRelationships();
