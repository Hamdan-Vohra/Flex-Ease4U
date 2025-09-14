import { extractStudentInfo } from "./utils/extractStudentInfo.js";
document.addEventListener("DOMContentLoaded", function () {
  // If download button is clicked
  document
    .getElementById("download-transcript")
    .addEventListener("click", async () => {
      chrome.runtime.sendMessage({ action: "getContent" }, (response) => {
        if (response.success) {
          const HTMLcontent = response.content;

          const dom = new DOMParser().parseFromString(HTMLcontent, "text/html");

          // Extract student info
          const studentInfo = extractStudentInfo(dom);
          console.log(studentInfo);
        } else {
          console.error("Error fetching content:", response.error);
        }
      });
    });
});
