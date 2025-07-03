// Function to generate reply using OpenAI API
async function generateReply(content, model = 'chatgpt', customPromptFromPopup = '') {
  console.log('generateReply function called with model:', model);
  console.log('customPromptFromPopup received:', customPromptFromPopup);

  const keysAndPrompt = await new Promise((resolve) => {
    chrome.storage.sync.get(['openaiApiKey', 'geminiApiKey', 'customPrompt'], (result) => {
      resolve(result);
    });
  });

  const apiKey = model.startsWith('gemini') ? keysAndPrompt.geminiApiKey : keysAndPrompt.openaiApiKey;
  console.log('Using API Key for model:', model, 'Key exists:', !!apiKey);
  if (!apiKey) {
    return `No API key set for ${model}. Please save your API key in the extension popup.`
  }

  let system_prompt = 'You are my assistant to create a reply to content X. Create a reply that supports the content or provides an assessment from another point of view, the reply is in English and limits it to a maximum of 250 characters.';

  if (customPromptFromPopup) {
    system_prompt = customPromptFromPopup;
    console.log('Using custom prompt from popup:', system_prompt);
  } else if (keysAndPrompt.customPrompt) { // Otherwise, use the default custom prompt from settings
    system_prompt = keysAndPrompt.customPrompt;
    console.log('Using default custom prompt from settings:', system_prompt);
  } else {
    console.log('Using default system prompt.', system_prompt);
  }

  try {
    let response;
    if (model.startsWith('gemini')) {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${system_prompt} Generate a reply to this X post: "${content}"`
            }]
          }]
        }),
      });
    } else { // chatgpt
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: system_prompt,
            },
            {
              role: 'user',
              content: `Generate a reply to this X post: "${content}"`,
            },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });
    }

    if (!response.ok) {
      const errorData = await response.json();
      let errorMessage = `HTTP error! Status: ${response.status}`;
      if (errorData && errorData.error && errorData.error.message) {
        errorMessage += ` - ${errorData.error.message}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    let reply;
    if (model.startsWith('gemini')) {
      reply = data.candidates[0]?.content?.parts[0]?.text.trim();
    } else { // chatgpt
      reply = data.choices[0]?.message?.content.trim();
    }
    return reply || 'Could not generate reply.';
  } catch (error) {
    console.error(`${model} API error:`, error);
    return `Error generating reply: ${error.message}`;
  }
}

// Handle messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateReply') {
    generateReply(request.content, request.model, request.customPrompt)
      .then((reply) => {
        sendResponse({ reply });
      })
      .catch((error) => {
        sendResponse({ reply: `Error: ${error.message}` });
      });
    return true; // Keep the message channel open for async response
  }
});