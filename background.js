// Function to generate reply using OpenAI API
async function generateReply(content) {
  const apiKey = await new Promise((resolve) => {
    chrome.storage.sync.get(['openaiApiKey'], (result) => {
      resolve(result.openaiApiKey);
    });
  });

  if (!apiKey) {
    return 'No API key set. Please save your OpenAI API key in the extension popup.';
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Changed to gpt-4o
        messages: [
          {
            role: 'system',
            content: 'You are a friendly assistant that generates short, contextually appropriate replies for X posts. Keep replies under 280 characters, lowercase, positive, playful, and engaging.',
          },
          {
            role: 'user',
            content: `Generate a reply to this X post: "${content}"`,
          },
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json(); // Attempt to get error details
      let errorMessage = `HTTP error! Status: ${response.status}`;
      if (errorData && errorData.error && errorData.error.message) {
        errorMessage += ` - ${errorData.error.message}`; // Add OpenAI error message
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content.trim();
    return reply || 'Could not generate reply.';
  } catch (error) {
    console.error('OpenAI API error:', error);
    return `Error generating reply: ${error.message}`; // Include the error message
  }
}

// Handle messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateReply') {
    generateReply(request.content)
      .then((reply) => {
        sendResponse({ reply });
      })
      .catch((error) => {
        sendResponse({ reply: `Error: ${error.message}` }); // Send back the error
      });
    return true; // Keep the message channel open for async response
  }
});