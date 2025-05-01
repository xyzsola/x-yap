document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const saveApiKeyButton = document.getElementById('saveApiKey');
  const generateReplyButton = document.getElementById('generateReply');
  const statusDisplay = document.getElementById('status');
  const errorDisplay = document.getElementById('error');
  const resultDisplay = document.getElementById('result');

  function showErrorMessage(message) {
    errorDisplay.textContent = message;
    errorDisplay.style.display = 'block';
  }

  function hideErrorMessage() {
    errorDisplay.style.display = 'none';
    errorDisplay.textContent = ''; // Clear message
  }

  // Load API key on popup load
  chrome.storage.sync.get(['openaiApiKey'], (result) => {
    if (result.openaiApiKey) {
      apiKeyInput.value = result.openaiApiKey;
      generateReplyButton.disabled = false;
      hideErrorMessage();
    } else {
      generateReplyButton.disabled = true;
    }
  });

  // Save API key
  saveApiKeyButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      chrome.storage.sync.set({ openaiApiKey: apiKey }, () => {
        statusDisplay.textContent = 'API key saved!';
        generateReplyButton.disabled = false;
        hideErrorMessage();
      });
    } else {
      showErrorMessage('Please enter a valid API key.');
      generateReplyButton.disabled = true;
      statusDisplay.textContent = 'Ready';
    }
  });

  // Generate reply
  generateReplyButton.addEventListener('click', () => {
    statusDisplay.textContent = 'Processing...';
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) { // Check if tab is valid
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getPostContent' }, (response) => {
          if (response && response.content) {
            chrome.runtime.sendMessage({ action: 'generateReply', content: response.content }, (replyResponse) => {
              if (replyResponse?.reply) { // Check for null or undefined
                chrome.tabs.sendMessage(tabs[0].id, { action: 'insertReply', reply: replyResponse.reply }, () => {
                  statusDisplay.textContent = 'Yap generated!';
                  resultDisplay.textContent = replyResponse.reply;
                });
              } else {
                statusDisplay.textContent = 'Failed to generate reply.';
              }
            });
          } else {
            statusDisplay.textContent = 'No post content found.';
          }
        });
      } else {
        statusDisplay.textContent = 'No active tab found.'; // Handle case where there is no active tab
      }
    });
  });
});