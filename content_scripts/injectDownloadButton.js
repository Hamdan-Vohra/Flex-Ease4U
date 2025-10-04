(function () {
  if (!location.pathname.includes("/Student/Transcript")) return;

  // Prevent duplicate button
  if (document.querySelector("#download-transcript")) return;

  // Finding the transcript header
  let portletHead = document.querySelector(
    ".m-portlet__head .m-portlet__head-title"
  );

  // Create wrapper div and set innerHTML
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <button id="download-transcript" title="Required page: Transcript">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        style="vertical-align: middle; margin-right: 5px;"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      Transcript
    </button>
  `;
  const btn = wrapper.firstElementChild;

  // Injecting into the Page Header
  if (portletHead) {
    portletHead.style.display = "flex";
    portletHead.style.alignItems = "center";
    portletHead.style.justifyContent = "space-between";
    portletHead.style.gap = "10px";
    portletHead.appendChild(btn);
  } else {
    const subheader = document.querySelector(".m-subheader");
    if (subheader) {
      subheader.style.display = "flex";
      subheader.style.alignItems = "center";
      subheader.style.justifyContent = "space-between";
      subheader.appendChild(btn);
    }
  }

  // Inject custom CSS for the button
  const style = document.createElement("style");
  style.textContent = `
    #download-transcript {
      background-color: #e7e7e7;
      color: black;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }
    #download-transcript:hover {
      background-color: #cccccc;
    }
  `;
  document.head.appendChild(style);
})();
