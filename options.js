document.addEventListener('DOMContentLoaded', () => {
  const modelSelect = document.getElementById('model');
  const openaiKeyContainer = document.getElementById('openai-key-container');
  const geminiKeyContainer = document.getElementById('gemini-key-container');
  const apiKeyInput = document.getElementById('apiKey');
  const geminiApiKeyInput = document.getElementById('geminiApiKey');
  const customPromptTextarea = document.getElementById('customPrompt');
  const saveSettingsButton = document.getElementById('saveSettings');
  const statusDisplay = document.getElementById('status');
  const toast = document.getElementById('toast');

  // New elements for backup/restore
  const backupSettingsButton = document.getElementById('backupSettings');
  const restoreSettingsButton = document.getElementById('restoreSettings');
  const restoreFileInput = document.getElementById('restoreFile');

  // New elements for custom prompt management
  const newPromptTitleInput = document.getElementById('newPromptTitle');
  const newPromptContentTextarea = document.getElementById('newPromptContent');
  const addPromptButton = document.getElementById('addPrompt');
  const cancelEditButton = document.getElementById('cancelEdit');
  const promptsList = document.getElementById('promptsList');

  let customPrompts = []; // Array to store custom prompts
  let editingIndex = -1; // -1 means not editing, otherwise it's the index of the prompt being edited

  function showToast(message) {
    toast.textContent = message;
    toast.style.visibility = 'visible';
    toast.style.opacity = 1;
    let fadeEffect = setInterval(() => {
      if (!toast.style.opacity) {
        toast.style.opacity = 1;
      }
      if (toast.style.opacity > 0) {
        toast.style.opacity -= 0.1;
      } else {
        clearInterval(fadeEffect);
        toast.style.visibility = 'hidden';
      }
    }, 200); // Adjust fade speed as needed
  }

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
    chrome.storage.sync.get(['defaultCustomPromptTitle'], (result) => {
      const defaultTitle = result.defaultCustomPromptTitle;
      customPrompts.forEach((prompt, index) => {
        const listItem = document.createElement('li');
        listItem.style.cssText = 'background-color: #f9f9f9; padding: 10px 15px; margin-bottom: 8px; border-radius: 6px; border: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;';
        const isDefault = (prompt.title === defaultTitle);
        listItem.innerHTML = `
          <span style="font-weight: 500; color: #333;">${prompt.title} ${isDefault ? '(Default)' : ''}</span>
          <div style="display: flex; align-items: center;">
            <button data-index="${index}" class="edit-prompt-button" style="background-color: #007bff; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.85em; transition: background-color 0.3s ease; margin-left: 5px;" aria-label="Edit Prompt"><i class="glyphicon glyphicon-pencil"></i></button>
            <button data-index="${index}" class="set-default-button" style="background-color: #28a745; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.85em; transition: background-color 0.3s ease; margin-left: 5px;" aria-label="Set as Default"><i class="glyphicon glyphicon-star"></i></button>
            <button data-index="${index}" class="delete-prompt-button" style="background-color: #dc3545; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.85em; transition: background-color 0.3s ease; margin-left: 5px;" aria-label="Delete Prompt"><i class="glyphicon glyphicon-trash"></i></button>
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
          addPromptButton.innerHTML = '<i class="glyphicon glyphicon-floppy-disk"></i> Save Changes';
          addPromptButton.style.backgroundColor = '#28a745'; // Green for save
          cancelEditButton.style.display = 'inline-block';
        });
      });

      // Add event listeners to set as default buttons
      document.querySelectorAll('.set-default-button').forEach(button => {
        button.addEventListener('click', (event) => {
          const indexToSetDefault = parseInt(event.target.dataset.index);
          const promptToSetDefault = customPrompts[indexToSetDefault];
          chrome.storage.sync.set({ defaultCustomPromptTitle: promptToSetDefault.title }, () => {
            showToast('Default prompt updated!');
            renderCustomPrompts(); // Re-render to show default flag
          });
        });
      });

      // Add event listeners to delete buttons
      document.querySelectorAll('.delete-prompt-button').forEach(button => {
        button.addEventListener('click', (event) => {
          const indexToDelete = parseInt(event.target.dataset.index);
          const deletedPromptTitle = customPrompts[indexToDelete].title;
          customPrompts.splice(indexToDelete, 1); // Remove prompt from array
          saveCustomPrompts(); // Save updated array to storage
          renderCustomPrompts(); // Re-render the list
          if (editingIndex === indexToDelete) { // If the deleted item was being edited
            cancelEdit();
          }
          // If the deleted prompt was the default, clear the default setting
          chrome.storage.sync.get(['defaultCustomPromptTitle'], (result) => {
            if (result.defaultCustomPromptTitle === deletedPromptTitle) {
              chrome.storage.sync.remove('defaultCustomPromptTitle', () => {
                showToast('Default prompt cleared as it was deleted.');
              });
            }
          });
        });
      });
    });
  }

  function saveCustomPrompts() {
    chrome.storage.sync.set({ customPrompts: customPrompts }, () => {
      showToast('Custom prompts saved!');
    });
  }

  function cancelEdit() {
    editingIndex = -1;
    newPromptTitleInput.value = '';
    newPromptContentTextarea.value = '';
        addPromptButton.innerHTML = '<i class="glyphicon glyphicon-plus"></i> Add New Prompt';
    addPromptButton.style.backgroundColor = '#007bff'; // Blue for add
    cancelEditButton.style.display = 'none';
  }

  // Backup settings
  backupSettingsButton.addEventListener('click', () => {
    chrome.storage.sync.get(null, (items) => { // null to get all items
      const dataStr = JSON.stringify(items, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'x-yap-settings-backup.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Settings backed up!');
    });
  });

  // Restore settings
  restoreSettingsButton.addEventListener('click', () => {
    console.log('Restore Settings button clicked.');
    restoreFileInput.click(); // Trigger the hidden file input click
  });

  restoreFileInput.addEventListener('change', (event) => {
    console.log('File input change event triggered.');
    const file = event.target.files[0];
    if (file) {
      console.log('File selected:', file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        console.log('FileReader loaded content.');
        try {
          const restoredSettings = JSON.parse(e.target.result);
          console.log('Settings parsed:', restoredSettings);
          // Clear current settings before restoring
          chrome.storage.sync.clear(() => {
            console.log('Storage cleared.');
            chrome.storage.sync.set(restoredSettings, () => {
              console.log('Settings restored.');
              showToast('Settings restored successfully! Please reload the extension.');
              // Reload the options page to reflect changes
              window.location.reload();
            });
          });
        } catch (error) {
          console.error('Error parsing JSON or restoring settings:', error);
          showToast('Error restoring settings: Invalid JSON file.');
        }
      };
      reader.readAsText(file);
    } else {
      console.log('No file selected.');
    }
  });

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
        const oldTitle = customPrompts[editingIndex].title;
        customPrompts[editingIndex] = { title, content };
        // If the edited prompt was the default, update the defaultCustomPromptTitle
        chrome.storage.sync.get(['defaultCustomPromptTitle'], (result) => {
          if (result.defaultCustomPromptTitle === oldTitle) {
            chrome.storage.sync.set({ defaultCustomPromptTitle: title });
          }
        });
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
      showToast('Settings saved!');
    });
  });
});