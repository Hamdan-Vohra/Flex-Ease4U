function showInstructionModal(message) {
  // Remove existing modal if present
  const existing = document.getElementById("flex-instruction-modal");
  if (existing) existing.remove();

  // Modal HTML
  const modal = document.createElement("div");
  modal.id = "flex-instruction-modal";
  modal.innerHTML = `
    <div style="
      position:fixed;
      inset:0;
      background:rgba(0,0,0,0.3);
      display:flex;
      align-items:center;
      justify-content:center;
      z-index:999999;
    ">
      <div style="
        background:#fff;
        padding:24px 32px;
        border-radius:10px;
        box-shadow:0 2px 16px rgba(0,0,0,0.18);
        min-width:260px;
        text-align:center;
        max-width:90vw;
      ">
        <div style="margin-bottom:18px;font-size:16px;">${message}</div>
        <button id="flex-modal-close-btn" style="
          padding:7px 18px;
          border-radius:6px;
          border:none;
          background:#003366;
          color:#fff;
          font-weight:bold;
          cursor:pointer;
        ">OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById("flex-modal-close-btn").onclick = () => {
    modal.remove();
  };
}

// Listen for message from popup
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === "showInstructionModal" && req.message) {
    showInstructionModal(req.message);
    sendResponse({ success: true });
  }
});
