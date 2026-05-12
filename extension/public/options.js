const apiKeyInput = document.getElementById('apiKey');
const saveBtn = document.getElementById('saveBtn');
const statusMsg = document.getElementById('statusMsg');
const currentStatus = document.getElementById('currentStatus');

chrome.storage.local.get('nvidiaApiKey', (data) => {
  if (data.nvidiaApiKey) {
    apiKeyInput.value = data.nvidiaApiKey;
    currentStatus.innerHTML = '<span class="status-badge active">API Key Set</span>';
  } else {
    currentStatus.innerHTML = '<span class="status-badge inactive">No API Key</span>';
  }
});

saveBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    statusMsg.textContent = 'Please enter an API key';
    statusMsg.className = 'status error';
    return;
  }
  chrome.storage.local.set({ nvidiaApiKey: key }, () => {
    statusMsg.textContent = 'Saved! Astra is ready to teach.';
    statusMsg.className = 'status success';
    currentStatus.innerHTML = '<span class="status-badge active">API Key Set</span>';
    setTimeout(() => { statusMsg.textContent = ''; }, 3000);
  });
});
