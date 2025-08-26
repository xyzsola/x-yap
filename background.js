// Fungsi utama buat generate reply pake AI (OpenAI atau Gemini)
// Ini yang jadi otak dari ekstensi, dia bakal bikin 3 versi reply yang beda-beda
async function generateReply(content, options = {}) {
  const { mode, customPrompt: customPromptFromPopup } = options;
  console.log('generateReply function called with options:', options);

  // Ambil data dari storage extension (API key, model yang dipilih, dll)
  const { openaiApiKey, geminiApiKey, customPrompt, selectedModel } = await new Promise((resolve) => {
    chrome.storage.sync.get(['openaiApiKey', 'geminiApiKey', 'customPrompt', 'selectedModel'], (result) => {
      resolve(result);
    });
  });

  // Tentuin model mana yang mau dipake (default ChatGPT)
  const model = selectedModel || 'chatgpt';
  console.log('Using model from storage:', model);

  // Pilih API key yang sesuai sama model yang dipilih
  const apiKey = model.startsWith('gemini') ? geminiApiKey : openaiApiKey;
  console.log('Using API Key for model:', model, 'Key exists:', !!apiKey);
  if (!apiKey) {
    return { error: `No API key set for ${model}. Please save your API key in the extension popup.` };
  }

// Fungsi buat parsing response dari AI jadi 3 reply terpisah
// Soalnya AI kadang ngasih format yang beda-beda, jadi perlu di-parse dengan hati-hati
function parseMultipleReplies(responseText) {
  const replies = [];
  const replyNames = ['Option 1', 'Option 2', 'Option 3']; // Nama untuk 3 opsi reply
  
  try {
    // Coba parsing dengan cara split per baris dan cari yang bernomor
    const lines = responseText.split('\n').filter(line => line.trim());
    
    let currentReplyIndex = -1; // Index reply yang lagi diproses
    let currentContent = ''; // Isi reply yang lagi dikumpulin
    
    // Loop semua baris buat nyari pattern nomor dan isi reply
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Cek apakah baris ini mulai dengan nomor (1., 2., 3.)
      const match = trimmedLine.match(/^(\d+)\.\s*(.*)$/);
      
      if (match) {
        const replyNumber = parseInt(match[1]);
        
        // Simpen reply sebelumnya kalo ada
        if (currentReplyIndex >= 0 && currentContent.trim()) {
          replies.push({
            name: replyNames[currentReplyIndex] || `Option ${currentReplyIndex + 1}`,
            content: currentContent.trim()
          });
        }
        
        // Mulai reply baru (cuma terima nomor 1-3)
        if (replyNumber >= 1 && replyNumber <= 3) {
          currentReplyIndex = replyNumber - 1;
          currentContent = match[2] || '';
        }
      } else if (currentReplyIndex >= 0 && trimmedLine) {
        // Lanjutin isi reply yang lagi diproses (gabungin dengan spasi)
        currentContent += (currentContent ? ' ' : '') + trimmedLine;
      }
    }
    
    // Jangan lupa simpen reply terakhir
    if (currentReplyIndex >= 0 && currentContent.trim()) {
      replies.push({
        name: replyNames[currentReplyIndex] || `Option ${currentReplyIndex + 1}`,
        content: currentContent.trim()
      });
    }
    
    // Kalo parsing gagal atau belum dapet 3 reply, coba cara lain
    if (replies.length < 3) {
      // Coba parsing alternatif: split per baris dan cari konten
      const cleanLines = responseText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.match(/^\d+\.\s*$/));
      
      const fallbackReplies = [];
      let currentReply = '';
      
      // Coba kumpulin reply dengan cara yang lebih fleksibel
      for (const line of cleanLines) {
        // Kalo ketemu nomor, simpen reply sebelumnya dan mulai yang baru
        if (line.match(/^\d+\./)) {
          if (currentReply.trim()) {
            fallbackReplies.push(currentReply.trim());
          }
          currentReply = line.replace(/^\d+\.\s*/, '');
        } else {
          // Gabungin dengan reply yang lagi dikumpulin
          currentReply += (currentReply ? ' ' : '') + line;
        }
      }
      
      // Simpen reply terakhir
      if (currentReply.trim()) {
        fallbackReplies.push(currentReply.trim());
      }
      
      // Ubah ke format yang bener (dengan name dan content)
      if (fallbackReplies.length >= 3) {
        return fallbackReplies.slice(0, 3).map((content, index) => ({
          name: replyNames[index],
          content: content
        }));
      }
      
      // Fallback terakhir - bagi response jadi 3 bagian berdasarkan kalimat
      const sentences = responseText.split(/[.!?]+/).filter(s => s.trim().length > 10);
      if (sentences.length >= 3) {
        return sentences.slice(0, 3).map((content, index) => ({
          name: replyNames[index],
          content: content.trim() + '.'
        }));
      }
      
      // Fallback paling terakhir - pake response yang sama untuk semua opsi
      const singleReply = responseText.trim();
      return replyNames.map(name => ({
        name: name,
        content: singleReply || 'Could not generate reply.'
      }));
    }
    
    // Pastiin kita punya tepat 3 reply (kalo kurang, duplikat yang pertama)
    while (replies.length < 3) {
      replies.push({
        name: replyNames[replies.length],
        content: replies[0]?.content || 'Could not generate reply.'
      });
    }
    
    // Return cuma 3 reply pertama (kalo lebih dari 3)
    return replies.slice(0, 3);
    
  } catch (error) {
    console.error('Error parsing multiple replies:', error);
    // Kalo ada error, ya udah pake reply yang sama aja buat semua
    const singleReply = responseText.trim() || 'Could not generate reply.';
    return replyNames.map(name => ({
      name: name,
      content: singleReply
    }));
  }
}

  // Template prompt untuk 3 jenis reply yang beda (ini sebenarnya udah ga kepake lagi)
  // Tapi masih disimpen buat jaga-jaga kalo butuh referensi
  const prompts = [
    {
      name: 'Supportive',
      prompt: customPromptFromPopup || 'You are my assistant to create a supportive reply to content X. Create a reply that supports the content or provides encouragement, the reply is in English and limits it to a maximum of 250 characters.'
    },
    {
      name: 'Analytical', 
      prompt: customPromptFromPopup || 'You are my assistant to create an analytical reply to content X. Create a reply that provides thoughtful analysis or asks insightful questions, the reply is in English and limits it to a maximum of 250 characters.'
    },
    {
      name: 'Engaging',
      prompt: customPromptFromPopup || 'You are my assistant to create an engaging reply to content X. Create a reply that sparks conversation or adds interesting perspective, the reply is in English and limits it to a maximum of 250 characters.'
    }
  ];

  // Kalo user kasih custom prompt, pake itu dengan variasi dikit
  // (bagian ini juga udah ga kepake, tapi masih disimpen)
  if (customPromptFromPopup) {
    prompts[0].prompt = customPromptFromPopup;
    prompts[1].prompt = customPromptFromPopup + ' Make it more analytical and thoughtful.';
    prompts[2].prompt = customPromptFromPopup + ' Make it more engaging and conversational.';
  } else if (mode) {
    // Tentuin base prompt berdasarkan mode yang dipilih user
    let basePrompt = '';
    switch (mode) {
      case 'casual':
        basePrompt = 'You are my assistant. Create a casual and friendly reply to the following content. Keep it short and in English, under 250 characters.';
        break;
      case 'professional':
        basePrompt = 'You are my professional assistant. Formulate a formal and respectful reply to the following content. The reply should be in English and concise, with a maximum of 250 characters.';
        break;
      case 'witty':
        basePrompt = 'You are a witty assistant. Come up with a clever and humorous reply to the following content. The reply must be in English and not exceed 250 characters.';
        break;
      case 'sarcastic':
        basePrompt = 'You are a sarcastic assistant. Generate a sarcastic reply to the following content. Ensure the reply is in English and within the 250-character limit.';
        break;
      case 'standard':
      default:
        if (customPrompt) {
          basePrompt = customPrompt;
          console.log('Using default custom prompt from settings for standard mode:', basePrompt);
        } else {
          basePrompt = 'You are my assistant to create a reply to content X. Create a reply that supports the content or provides an assessment from another point of view, the reply is in English and limits it to a maximum of 250 characters.';
        }
        break;
    }
    // Bikin variasi dari base prompt (ini juga udah ga kepake)
    prompts[0].prompt = basePrompt;
    prompts[1].prompt = basePrompt + ' Make it more detailed.';
    prompts[2].prompt = basePrompt + ' Make it more concise.';
  } else if (customPrompt) {
    // Kalo ada custom prompt dari settings, pake itu
    prompts[0].prompt = customPrompt;
    prompts[1].prompt = customPrompt + ' Make it more analytical.';
    prompts[2].prompt = customPrompt + ' Make it more engaging.';
    console.log('Using default custom prompt from settings:', customPrompt);
  }

  try {
    // Bikin satu prompt aja yang minta AI generate 3 versi sekaligus (lebih hemat token)
    const basePrompt = customPromptFromPopup || 
      (customPrompt || 'You are my assistant to create a reply to content X. Create a reply that supports the content or provides an assessment from another point of view, the reply is in English and limits it to a maximum of 250 characters.');
    
    // Gabungin base prompt dengan instruksi buat bikin 3 versi
    const combinedPrompt = `${basePrompt}

Generate exactly 3 different versions of a reply to this X post: "${content}"

Format your response as follows:
1. [A supportive and encouraging reply]
2. [An analytical and thoughtful reply]
3. [An engaging and conversational reply]

Each reply should be under 250 characters and have a different tone/approach.`;

    // Kirim request ke API yang sesuai (Gemini atau OpenAI)
    let response;
    if (model.startsWith('gemini')) {
      // Request ke Gemini API
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: combinedPrompt
            }]
          }]
        }),
      });
    } else { // Request ke OpenAI API
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
              role: 'user',
              content: combinedPrompt,
            },
          ],
          max_tokens: 800, // Lebih banyak token karena minta 3 reply
          temperature: 0.8, // Agak tinggi biar lebih kreatif
        }),
      });
    }

    // Cek apakah request berhasil
    if (!response.ok) {
      const errorData = await response.json();
      let errorMessage = `HTTP error! Status: ${response.status}`;
      if (errorData && errorData.error && errorData.error.message) {
        errorMessage += ` - ${errorData.error.message}`;
      }
      throw new Error(errorMessage);
    }

    // Ambil response dari API dan extract text-nya
    const data = await response.json();
    let responseText;
    if (model.startsWith('gemini')) {
      responseText = data.candidates[0]?.content?.parts[0]?.text.trim();
    } else { // chatgpt
      responseText = data.choices[0]?.message?.content.trim();
    }
    
    // Parse response jadi 3 reply terpisah
    const replies = parseMultipleReplies(responseText);
    
    return { replies };
  } catch (error) {
    console.error(`${model} API error:`, error);
    return { error: `Error generating reply: ${error.message}` };
  }
}

// Listener buat handle pesan dari popup atau content script
// Ini yang nerima request generate reply dan balikin hasilnya
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateReply') {
    // Panggil fungsi generateReply dengan parameter yang dikirim
    generateReply(request.content, { mode: request.mode, customPrompt: request.customPrompt })
      .then((result) => {
        if (result.error) {
          sendResponse({ error: result.error });
        } else {
          sendResponse({ replies: result.replies }); // Kirim balik 3 reply ke yang request
        }
      })
      .catch((error) => {
        sendResponse({ error: `Error: ${error.message}` });
      });
    return true; // Biar message channel tetep buka buat async response
  }
});