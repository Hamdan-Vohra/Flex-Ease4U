(() => {
  console.log("Background script loaded");
})();
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getContent") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        sendResponse({
          success: false,
          error: "No active tab found.",
        });
        return;
      }
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          func: () => document.documentElement.outerHTML,
        },
        (results) => {
          if (chrome.runtime.lastError) {
            sendResponse({
              success: false,
              error: chrome.runtime.lastError.message,
            });
            return;
          }
          sendResponse({
            success: true,
            content: results[0].result,
            url: tabs[0].url,
          });
        }
      );
    });
    return true;
  }

  if (request.action === "getProfileImageBase64") {
    console.log("Fetching profile image as Base64");
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        sendResponse({ success: false, error: "No active tab found." });
        return;
      }
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          func: () => {
            // Find the profile image element
            const imgTag = document.querySelector(".m-topbar__userpic img");
            if (!imgTag) return null;
            // Draw image to canvas and get Base64
            const canvas = document.createElement("canvas");
            canvas.width = imgTag.naturalWidth;
            canvas.height = imgTag.naturalHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(imgTag, 0, 0);
            return canvas.toDataURL("image/jpeg");
          },
        },
        (results) => {
          if (chrome.runtime.lastError) {
            console.log(
              "Error fetching profile image:",
              chrome.runtime.lastError
            );
            sendResponse({
              success: false,
              error: chrome.runtime.lastError.message,
            });
            return;
          }
          sendResponse({
            success: true,
            base64: results[0].result,
          });
        }
      );
    });
    return true;
  }
});
