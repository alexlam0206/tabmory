document.getElementById('logBtn').addEventListener('click', () => {
  console.log('Button clicked in popup!');
  chrome.runtime.sendMessage({ action: 'log', message: 'Hello from popup!' });
});
