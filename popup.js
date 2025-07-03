document.addEventListener('DOMContentLoaded', () => {
  const generateReplyButton = document.getElementById('generateReply');
  const statusDisplay = document.getElementById('status');
  const errorDisplay = document.getElementById('error');
  const resultDisplay = document.getElementById('result');
  const openSettingsButton = document.getElementById('openSettings');
  const personaSelect = document.getElementById('persona');
  const selectedModelDisplay = document.getElementById('selected-model-display');
  // const replyToInfoDisplay = document.getElementById('reply-to-info');

  function updateGenerateButtonState() {
    chrome.storage.sync.get(['openaiApiKey', 'geminiApiKey'], (result) => {
      generateReplyButton.disabled = !result.openaiApiKey && !result.geminiApiKey;
    });
  }

  function showErrorMessage(message) {
    errorDisplay.textContent = message;
    errorDisplay.style.display = 'block';
  }

  function hideErrorMessage() {
    errorDisplay.style.display = 'none';
    errorDisplay.textContent = ''; // Clear message
  }

  // Initial state for generateReplyButton
  updateGenerateButtonState();

  // Load persona and model settings on popup load
  chrome.storage.sync.get(['selectedPersona', 'selectedModel'], (result) => {
    if (result.selectedPersona) {
      personaSelect.value = result.selectedPersona;
    }
    if (result.selectedModel) {
      selectedModelDisplay.textContent = `AI Model: ${result.selectedModel}`;
    } else {
      selectedModelDisplay.textContent = `AI Model: chatgpt`; // Default
    }
  });

  // Save persona setting when it changes
  personaSelect.addEventListener('change', () => {
    chrome.storage.sync.set({ selectedPersona: personaSelect.value });
  });

  openSettingsButton.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Listen for changes in storage to update button state and displayed model
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
      if (changes.openaiApiKey || changes.geminiApiKey) {
        updateGenerateButtonState();
      }
      if (changes.selectedModel) {
        selectedModelDisplay.textContent = `AI Model: ${changes.selectedModel.newValue}`;
      }
    }
  });

  // Copy result to clipboard
  resultDisplay.addEventListener('click', () => {
    const textToCopy = resultDisplay.textContent;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        const originalStatus = statusDisplay.textContent;
        statusDisplay.textContent = 'Copied to clipboard!';
        setTimeout(() => {
          if (statusDisplay.textContent === 'Copied to clipboard!') {
            statusDisplay.textContent = originalStatus;
          }
        }, 1500);
      }).catch(err => {
        console.error('Failed to copy text: ', err);
        statusDisplay.textContent = 'Failed to copy.';
      });
    }
  });

  // Generate reply
  generateReplyButton.addEventListener('click', async () => {
    statusDisplay.textContent = 'Processing...';
    const selectedPersona = personaSelect.value;
    const selectedModel = (await chrome.storage.sync.get(['selectedModel'])).selectedModel || 'chatgpt';

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getPostContent' }, (response) => {
          if (response && response.content) {
            // if (response.origin) {
            //   replyToInfoDisplay.textContent = `${response.origin}`;
            //   replyToInfoDisplay.style.display = 'block';
            // } else {
            //   replyToInfoDisplay.style.display = 'none';
            // }
            console.log('Sending message to background.js with model:', selectedModel);
            chrome.runtime.sendMessage({ 
              action: 'generateReply', 
              content: response.content, 
              persona: selectedPersona,
              model: selectedModel
            }, (replyResponse) => {
              if (replyResponse?.reply) {
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
        statusDisplay.textContent = 'No active tab found.';
      }
    });
  });
});