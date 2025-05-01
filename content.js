function waitForElement(selector, callback) {
  console.log(`wait for element...`)
  const element = document.querySelector(selector);
  if (element) {
    callback(element);
  } else {
    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        callback(element);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

function addReplyButton() {
  const replyContainers = document.querySelectorAll('div[data-testid="tweetTextarea_0"]');
  replyContainers.forEach((replyContainer) => {
    if (replyContainer && !replyContainer.querySelector(".generate-reply-button")) {
      const generateReplyButton = document.createElement("button");
      generateReplyButton.textContent = "Generate Reply";
      generateReplyButton.className = "generate-reply-button";
      generateReplyButton.style.cssText = `
        margin-left: 8px;
        background-color: #1DA1F2;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 12px;
        cursor: pointer;
        font-size: 14px;
        line-height: 1;
        transition: background-color 0.3s ease;
        font-family: 'Inter', sans-serif;
      `;

      generateReplyButton.addEventListener("mouseenter", () => {
        generateReplyButton.style.backgroundColor = "#137ebd";
      });
      generateReplyButton.addEventListener("mouseleave", () => {
        generateReplyButton.style.backgroundColor = "#1DA1F2";
      });

      const locationButton = replyContainer
        .closest("div")
        .querySelector(
          'button[data-testid="geoButton"], button[aria-label*="location"]'
        );
      if (locationButton) {
        locationButton.parentNode.insertBefore(
          generateReplyButton,
          locationButton.nextSibling
        );
      } else {
        replyContainer.parentElement.appendChild(generateReplyButton); // Append if no location button
      }

      generateReplyButton.addEventListener("click", () => {
        const article = replyContainer.closest("article");
        const dialog = replyContainer.closest('div[role="dialog"]');
        let postContent = "";

        if (article) {
          const contentDiv = article.querySelector("div[lang]");
          if (contentDiv) {
            postContent = contentDiv.innerText;
          }
        } else if (dialog) {
          const contentDiv = dialog.querySelector("div[lang]");
          if (contentDiv) {
            postContent = contentDiv.innerText;
          }
        }

        if (!postContent) {
          postContent = "No content found";
        }

        chrome.runtime.sendMessage(
          { action: "generateReply", content: postContent },
          (response) => {
            if (response?.reply) {
              const textarea = replyContainer.querySelector("textarea");
              if (textarea) {
                textarea.value = response.reply;
                textarea.dispatchEvent(new Event("input", { bubbles: true }));
                textarea.focus();
              }
            }
          }
        );
      });
    }
  });
}

// Listen for messages (this part is fine)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPostContent") {
    let postContent = "";
    const article = document.querySelector("article");
    const dialog = document.querySelector('div[role="dialog"]');

    if (article) {
      const contentDiv = article.querySelector("div[lang]");
      if (contentDiv) {
        postContent = contentDiv.innerText;
      }
    } else if (dialog) {
      const contentDiv = dialog.querySelector("div[lang]");
      if (contentDiv) {
        postContent = contentDiv.innerText;
      }
    }
    sendResponse({ content: postContent || "No content found" });
  } else if (request.action === "insertReply") {
    const textarea = document.querySelector('textarea[placeholder*="Post your reply"]');
    if (textarea) {
      textarea.value = request.reply;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }
    sendResponse({ status: "Reply inserted" });
  }
});

// Wait for the element and then run addReplyButton and start observing
// waitForElement('div[data-testid="tweetTextarea_0"]', () => {  //  Use a more specific, and hopefully, stable selector.
//   addReplyButton();
//   const observer = new MutationObserver(addReplyButton);
//   observer.observe(document.body, { childList: true, subtree: true });
// });