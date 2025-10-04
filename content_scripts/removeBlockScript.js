chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "removeBlockScript") {
    // Remove script tags
    document.querySelectorAll("script").forEach((script) => {
      if (
        script.textContent.includes("event.keyCode == 123") ||
        script.textContent.includes("contextmenu") ||
        script.textContent.includes("console[methods[i]]")
      ) {
        script.remove();
      }
    });

    // Remove direct event handler assignments
    document.onkeydown = null;
    document.oncontextmenu = null;
    window.onkeydown = null;
    window.oncontextmenu = null;

    // Remove jQuery event listeners if jQuery is present
    if (window.jQuery) {
      try {
        jQuery(document).off("contextmenu");
        jQuery(document).off("keydown");
        jQuery(document).unbind("contextmenu");
        jQuery(document).unbind("keydown");
      } catch (e) {}
    }

    // Remove listeners added via addEventListener
    document.addEventListener(
      "contextmenu",
      function (e) {
        e.stopImmediatePropagation();
      },
      true
    );

    document.addEventListener(
      "keydown",
      function (e) {
        e.stopImmediatePropagation();
      },
      true
    );

    sendResponse({ success: true });
  }
});
