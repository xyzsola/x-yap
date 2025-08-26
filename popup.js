document.addEventListener('DOMContentLoaded', () => {
  const generateReplyButton = document.getElementById('generateReply');
  const statusDisplay = document.getElementById('status');
  const errorDisplay = document.getElementById('error');
  const resultDisplay = document.getElementById('result');
  const openSettingsButton = document.getElementById('openSettings');
  const repliesContainer = document.getElementById('replies-container');
  
  const selectedModelDisplay = document.getElementById('selected-model-display');
  const customPromptDropdown = document.getElementById('customPromptDropdown');

  let selectedCustomPromptContent = ''; // To store the content of the selected custom prompt

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

  // Function to populate custom prompt dropdown
  function populateCustomPromptDropdown(customPrompts) {
    customPromptDropdown.innerHTML = '<option value="">None</option>'; // Default option
    if (customPrompts && customPrompts.length > 0) {
      customPrompts.forEach(prompt => {
        const option = document.createElement('option');
        option.value = prompt.content; // Store content in value
        option.textContent = prompt.title;
        customPromptDropdown.appendChild(option);
      });
    }
  }

  // Initial state for generateReplyButton
  updateGenerateButtonState();

  // Load model and custom prompts settings on popup load
  chrome.storage.sync.get(['selectedModel', 'customPrompts', 'defaultCustomPromptTitle'], (result) => {
    if (result.selectedModel) {
      selectedModelDisplay.textContent = `AI Model: ${result.selectedModel}`;
    } else {
      selectedModelDisplay.textContent = `AI Model: chatgpt`; // Default
    }
    if (result.customPrompts) {
      populateCustomPromptDropdown(result.customPrompts);
      if (result.defaultCustomPromptTitle) {
        // Find the option with the matching title and set it as selected
        const defaultOption = Array.from(customPromptDropdown.options).find(
          option => option.textContent === result.defaultCustomPromptTitle
        );
        if (defaultOption) {
          customPromptDropdown.value = defaultOption.value;
          selectedCustomPromptContent = defaultOption.value;
        }
      }
    }
  });

  // Update selectedCustomPromptContent when dropdown changes
  customPromptDropdown.addEventListener('change', () => {
    selectedCustomPromptContent = customPromptDropdown.value;
    console.log('Selected custom prompt content:', selectedCustomPromptContent);
  });

  openSettingsButton.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Listen for changes in storage to update button state, displayed model, and custom prompts
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
      if (changes.openaiApiKey || changes.geminiApiKey) {
        updateGenerateButtonState();
      }
      if (changes.selectedModel) {
        selectedModelDisplay.textContent = `AI Model: ${changes.selectedModel.newValue}`;
      }
      if (changes.customPrompts) {
        populateCustomPromptDropdown(changes.customPrompts.newValue);
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
  
  // Function to copy reply to clipboard
  function copyReplyToClipboard(replyText, buttonElement) {
    navigator.clipboard.writeText(replyText).then(() => {
      const originalText = buttonElement.textContent;
      buttonElement.textContent = 'Copied!';
      buttonElement.classList.add('copied');
      setTimeout(() => {
        buttonElement.textContent = originalText;
        buttonElement.classList.remove('copied');
      }, 1500);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      statusDisplay.textContent = 'Failed to copy.';
    });
  }
  
  // Function to display multiple replies
  function displayReplies(replies) {
    repliesContainer.style.display = 'block';
    resultDisplay.style.display = 'none';
    
    replies.forEach((reply, index) => {
      const optionElement = document.getElementById(`reply-option-${index + 1}`);
      const labelElement = optionElement.querySelector('.reply-label');
      const contentElement = optionElement.querySelector('.reply-content');
      const copyButton = optionElement.querySelector('.copy-btn');
      
      labelElement.textContent = reply.name;
      contentElement.textContent = reply.content;
      
      // Remove existing event listeners
      const newCopyButton = copyButton.cloneNode(true);
      copyButton.parentNode.replaceChild(newCopyButton, copyButton);
      
      const newContentElement = contentElement.cloneNode(true);
      contentElement.parentNode.replaceChild(newContentElement, contentElement);
      
      // Add new event listeners
      newCopyButton.addEventListener('click', () => {
        copyReplyToClipboard(reply.content, newCopyButton);
      });
      
      newContentElement.addEventListener('click', () => {
        copyReplyToClipboard(reply.content, newCopyButton);
      });
    });
  }
  
  // Function to hide replies and show single result
  function hideReplies() {
    repliesContainer.style.display = 'none';
    resultDisplay.style.display = 'block';
  }

  // Generate reply
  generateReplyButton.addEventListener('click', async () => {
    statusDisplay.textContent = 'Processing...';
    const selectedModel = (await chrome.storage.sync.get(['selectedModel'])).selectedModel || 'chatgpt';

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getPostContent' }, (response) => {
          if (response && response.content) {
            console.log('Sending message to background.js with model:', selectedModel);
            chrome.runtime.sendMessage({ 
              action: 'generateReply', 
              content: response.content, 
              model: selectedModel,
              customPrompt: selectedCustomPromptContent // Pass the selected custom prompt content
            }, (replyResponse) => {
              if (replyResponse?.replies) {
                statusDisplay.textContent = 'Yap generated! Choose one:';
                displayReplies(replyResponse.replies);
              } else if (replyResponse?.error) {
                statusDisplay.textContent = 'Failed to generate reply.';
                showErrorMessage(replyResponse.error);
                hideReplies();
              } else {
                statusDisplay.textContent = 'Failed to generate reply.';
                hideReplies();
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