document.addEventListener("DOMContentLoaded", function () {
  // Only run on /Student/Transcript
  if (!location.pathname.includes("/Student/Transcript")) return;

  // Find the transcript header
  const portletHead = document.querySelector(
    ".m-portlet__head .m-portlet__head-title"
  );
  console.log("Transcript header:", portletHead);
  if (!portletHead) return;

  // Prevent duplicate button
  if (document.querySelector(".download-transcript")) return;

  // Create button
  const btn = document.createElement("button");
  btn.textContent = "Download Transcript PDF";
  btn.className =
    "download-transcript m-btn m-btn--pill m-btn--air btn btn-info";
  btn.style.marginLeft = "20px";
  btn.style.fontWeight = "bold";

  // Insert button after the heading
  portletHead.appendChild(btn);
});
