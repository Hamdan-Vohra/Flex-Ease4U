import {
  extractStudentInfo,
  getCampusName,
} from "./utils/extractStudentInfo.js";
import { nuLogoBase64 } from "./utils/nuLogo.js"; // base64 logo

document.addEventListener("DOMContentLoaded", function () {
  document
    .getElementById("download-transcript")
    .addEventListener("click", async () => {
      chrome.runtime.sendMessage({ action: "getContent" }, (response) => {
        if (response.success) {
          const HTMLcontent = response.content;
          const dom = new DOMParser().parseFromString(HTMLcontent, "text/html");

          const studentInfo = extractStudentInfo(dom);
          const campus = getCampusName(studentInfo);

          const { jsPDF } = window.jspdf;
          const doc = new jsPDF();
          const pageWidth = doc.internal.pageSize.getWidth();

          // 🔹 Header: Logo + University Name side by side
          const logoWidth = 35;
          const logoHeight = 35;
          const marginTop = 15;
          const marginLeft = 10;

          // Logo
          doc.addImage(
            nuLogoBase64,
            "PNG",
            marginLeft,
            marginTop,
            logoWidth,
            logoHeight
          );

          // University Name next to logo
          doc.setFont("helvetica", "bold");
          doc.setFontSize(16);
          doc.text(
            "National University of Computer & Emerging Sciences",
            marginLeft + logoWidth + 5,
            marginTop + logoWidth / 2 - 2
          );

          doc.setFont("helvetica", "normal");
          doc.setFontSize(14);
          doc.text(
            campus,
            marginLeft + logoWidth + 5,
            marginTop + logoWidth / 2 + 5
          );

          // 🔹 Interim Transcript Title
          doc.setFont("helvetica", "bold");
          doc.setFontSize(18);
          doc.setTextColor(0, 51, 102); // light navy-blue (RGB)
          doc.text("INTERIM TRANSCRIPT", pageWidth / 2, 55, {
            align: "center",
          });

          // Reset text color
          doc.setTextColor(0, 0, 0);

          // 🔹 Horizontal Line
          doc.setLineWidth(0.5);
          doc.line(10, 65, pageWidth - 10, 65);

          // 🔹 Student Info in Table
          const tableData = studentInfo.map((info) => [info.title, info.value]);

          doc.autoTable({
            head: [["Field", "Value"]],
            body: tableData,
            startY: 75,
            theme: "grid",
            headStyles: { fillColor: [0, 51, 102] }, // navy-blue header
            styles: { fontSize: 11, cellPadding: 4 },
          });

          // 🔹 Save PDF
          doc.save("student_info.pdf");
        } else {
          console.error("Error fetching content:", response.error);
        }
      });
    });
});
