document.addEventListener('DOMContentLoaded', () => {
  const modelSelect = document.getElementById('model');
  const openaiKeyContainer = document.getElementById('openai-key-container');
  const geminiKeyContainer = document.getElementById('gemini-key-container');
  const apiKeyInput = document.getElementById('apiKey');
  const geminiApiKeyInput = document.getElementById('geminiApiKey');
  const customPromptTextarea = document.getElementById('customPrompt');
  const saveSettingsButton = document.getElementById('saveSettings');
  const statusDisplay = document.getElementById('status');

  // New elements for custom prompt management
  const newPromptTitleInput = document.getElementById('newPromptTitle');
  const newPromptContentTextarea = document.getElementById('newPromptContent');
  const addPromptButton = document.getElementById('addPrompt');
  const cancelEditButton = document.getElementById('cancelEdit');
  const promptsList = document.getElementById('promptsList');

  let customPrompts = []; // Array to store custom prompts
  let editingIndex = -1; // -1 means not editing, otherwise it's the index of the prompt being edited

  function updateKeyVisibility() {
    if (modelSelect.value === 'gemini-flash') {
      openaiKeyContainer.style.display = 'none';
      geminiKeyContainer.style.display = 'block';
    } else {
      openaiKeyContainer.style.display = 'block';
      geminiKeyContainer.style.display = 'none';
    }
  }

  function renderCustomPrompts() {
    promptsList.innerHTML = ''; // Clear existing list
    if (customPrompts.length === 0) {
      promptsList.innerHTML = '<li style="color: #66757f; font-size: 0.9em;">No custom prompts saved yet.</li>';
      return;
    }
    customPrompts.forEach((prompt, index) => {
      const listItem = document.createElement('li');
      listItem.style.cssText = 'background-color: #f9f9f9; padding: 10px 15px; margin-bottom: 8px; border-radius: 6px; border: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;';
      listItem.innerHTML = `
        <span style="font-weight: 500; color: #333;">${prompt.title}</span>
        <div>
          <button data-index="${index}" class="edit-prompt-button" style="background-color: #007bff; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.85em; transition: background-color 0.3s ease; margin-right: 5px;">Edit</button>
          <button data-index="${index}" class="delete-prompt-button" style="background-color: #dc3545; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.85em; transition: background-color 0.3s ease;">Delete</button>
        </div>
      `;
      promptsList.appendChild(listItem);
    });

    // Add event listeners to edit buttons
    document.querySelectorAll('.edit-prompt-button').forEach(button => {
      button.addEventListener('click', (event) => {
        const indexToEdit = parseInt(event.target.dataset.index);
        editingIndex = indexToEdit;
        const promptToEdit = customPrompts[indexToEdit];
        newPromptTitleInput.value = promptToEdit.title;
        newPromptContentTextarea.value = promptToEdit.content;
        addPromptButton.textContent = 'Save Changes';
        addPromptButton.style.backgroundColor = '#28a745'; // Green for save
        cancelEditButton.style.display = 'inline-block';
      });
    });

    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-prompt-button').forEach(button => {
      button.addEventListener('click', (event) => {
        const indexToDelete = parseInt(event.target.dataset.index);
        customPrompts.splice(indexToDelete, 1); // Remove prompt from array
        saveCustomPrompts(); // Save updated array to storage
        renderCustomPrompts(); // Re-render the list
        if (editingIndex === indexToDelete) { // If the deleted item was being edited
          cancelEdit();
        }
      });
    });
  }

  function saveCustomPrompts() {
    chrome.storage.sync.set({ customPrompts: customPrompts }, () => {
      statusDisplay.textContent = 'Custom prompts saved!';
      setTimeout(() => {
        statusDisplay.textContent = '';
      }, 2000);
    });
  }

  function cancelEdit() {
    editingIndex = -1;
    newPromptTitleInput.value = '';
    newPromptContentTextarea.value = '';
    addPromptButton.textContent = 'Add New Prompt';
    addPromptButton.style.backgroundColor = '#007bff'; // Blue for add
    cancelEditButton.style.display = 'none';
  }

  // Load settings on options page load
  chrome.storage.sync.get(['selectedModel', 'openaiApiKey', 'geminiApiKey', 'customPrompt', 'customPrompts'], (result) => {
    if (result.selectedModel) {
      modelSelect.value = result.selectedModel;
    }
    if (result.openaiApiKey) {
      apiKeyInput.value = result.openaiApiKey;
    }
    if (result.geminiApiKey) {
      geminiApiKeyInput.value = result.geminiApiKey;
    }
    
    if (result.customPrompt) {
      customPromptTextarea.value = result.customPrompt;
    }
    if (result.customPrompts) {
      customPrompts = result.customPrompts;
    }
    updateKeyVisibility();
    renderCustomPrompts(); // Render prompts on load
  });

  modelSelect.addEventListener('change', updateKeyVisibility);

  // Add new custom prompt or save edited prompt
  addPromptButton.addEventListener('click', () => {
    const title = newPromptTitleInput.value.trim();
    const content = newPromptContentTextarea.value.trim();

    if (title && content) {
      if (editingIndex !== -1) {
        // Save changes to existing prompt
        customPrompts[editingIndex] = { title, content };
        cancelEdit();
      } else {
        // Add new prompt
        customPrompts.push({ title, content });
      }
      saveCustomPrompts();
      renderCustomPrompts();
      newPromptTitleInput.value = '';
      newPromptContentTextarea.value = '';
    } else {
      statusDisplay.textContent = 'Please enter both title and content for the prompt.';
      setTimeout(() => {
        statusDisplay.textContent = '';
      }, 3000);
    }
  });

  cancelEditButton.addEventListener('click', cancelEdit);

  // Save general settings (including default custom prompt)
  saveSettingsButton.addEventListener('click', () => {
    const selectedModel = modelSelect.value;
    const openaiApiKey = apiKeyInput.value.trim();
    const geminiApiKey = geminiApiKeyInput.value.trim();
    const customPrompt = customPromptTextarea.value.trim();

    chrome.storage.sync.set({ 
      selectedModel: selectedModel,
      openaiApiKey: openaiApiKey,
      geminiApiKey: geminiApiKey,
      customPrompt: customPrompt
    }, () => {
      statusDisplay.textContent = 'Settings saved!';
      setTimeout(() => {
        statusDisplay.textContent = '';
      }, 2000);
    });
  });
});