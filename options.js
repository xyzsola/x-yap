document.addEventListener('DOMContentLoaded', () => {
  const modelSelect = document.getElementById('model');
  const openaiKeyContainer = document.getElementById('openai-key-container');
  const geminiKeyContainer = document.getElementById('gemini-key-container');
  const apiKeyInput = document.getElementById('apiKey');
  const geminiApiKeyInput = document.getElementById('geminiApiKey');
  const personaSelect = document.getElementById('persona');
  const customPromptTextarea = document.getElementById('customPrompt');
  const saveSettingsButton = document.getElementById('saveSettings');
  const statusDisplay = document.getElementById('status');

  function updateKeyVisibility() {
    if (modelSelect.value === 'gemini') {
      openaiKeyContainer.style.display = 'none';
      geminiKeyContainer.style.display = 'block';
    } else {
      openaiKeyContainer.style.display = 'block';
      geminiKeyContainer.style.display = 'none';
    }
  }

  // Load settings on options page load
  chrome.storage.sync.get(['selectedModel', 'openaiApiKey', 'geminiApiKey', 'selectedPersona', 'customPrompt'], (result) => {
    if (result.selectedModel) {
      modelSelect.value = result.selectedModel;
    }
    if (result.openaiApiKey) {
      apiKeyInput.value = result.openaiApiKey;
    }
    if (result.geminiApiKey) {
      geminiApiKeyInput.value = result.geminiApiKey;
    }
    if (result.selectedPersona) {
      personaSelect.value = result.selectedPersona;
    }
    if (result.customPrompt) {
      customPromptTextarea.value = result.customPrompt;
    }
    updateKeyVisibility();
  });

  modelSelect.addEventListener('change', updateKeyVisibility);

  // Save settings
  saveSettingsButton.addEventListener('click', () => {
    const selectedModel = modelSelect.value;
    const openaiApiKey = apiKeyInput.value.trim();
    const geminiApiKey = geminiApiKeyInput.value.trim();
    const selectedPersona = personaSelect.value;
    const customPrompt = customPromptTextarea.value.trim();

    chrome.storage.sync.set({ 
      selectedModel: selectedModel,
      openaiApiKey: openaiApiKey,
      geminiApiKey: geminiApiKey,
      selectedPersona: selectedPersona,
      customPrompt: customPrompt
    }, () => {
      statusDisplay.textContent = 'Settings saved!';
      setTimeout(() => {
        statusDisplay.textContent = '';
      }, 2000);
    });
  });
});