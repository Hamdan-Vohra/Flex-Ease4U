// (async () => {
//   // Load jsPDF + autoTable from local extension libs
//   if (typeof window.jspdf === "undefined") {
//     let script1 = document.createElement("script");
//     script1.src = chrome.runtime.getURL("libs/jspdf.umd.min.js");
//     document.body.appendChild(script1);
//     await new Promise((r) => (script1.onload = r));

//     let script2 = document.createElement("script");
//     script2.src = chrome.runtime.getURL("libs/jspdf.plugin.autotable.min.js");
//     document.body.appendChild(script2);
//     await new Promise((r) => (script2.onload = r));
//   }

//   const { jsPDF } = window.jspdf;

//   // === Extract Student Info ===
//   let infoNodes = document.querySelectorAll(
//     ".m-portlet__body .row .col-md-2, .m-portlet__body .row .col-md-3"
//   );
//   let studentInfo = Array.from(infoNodes)
//     .map((el) => el.innerText.trim())
//     .join(" | ");

//   // === Create PDF ===
//   const doc = new jsPDF();
//   doc.setFontSize(16);
//   doc.text("Academic Transcript", 10, 15);

//   doc.setFontSize(11);
//   doc.text(studentInfo, 10, 25);

//   let yPos = 35;

//   // === Loop through semesters ===
//   document
//     .querySelectorAll(".m-section__content .col-md-6")
//     .forEach((semesterDiv) => {
//       let semTitle = semesterDiv.querySelector("h5")?.innerText || "Semester";
//       let stats = semesterDiv.querySelector(".pull-right")?.innerText || "";

//       // Title
//       doc.setFontSize(12);
//       doc.text(`${semTitle} (${stats})`, 10, yPos);
//       yPos += 6;

//       // Table
//       let table = semesterDiv.querySelector("table");
//       if (table) {
//         let headers = Array.from(table.querySelectorAll("thead th")).map((th) =>
//           th.innerText.trim()
//         );
//         let rows = Array.from(table.querySelectorAll("tbody tr")).map((tr) =>
//           Array.from(tr.querySelectorAll("td")).map((td) => td.innerText.trim())
//         );

//         doc.autoTable({
//           head: [headers],
//           body: rows,
//           startY: yPos,
//           styles: { fontSize: 8 },
//           margin: { left: 10, right: 10 },
//         });

//         yPos = doc.lastAutoTable.finalY + 12;

//         // Add new page if near bottom
//         if (yPos > 260) {
//           doc.addPage();
//           yPos = 20;
//         }
//       }
//     });

//   // Save
//   doc.save("Transcript.pdf");
// })();
// (async () => {
//   // Load jsPDF first
//   if (typeof window.jspdf === "undefined") {
//     let script1 = document.createElement("script");
//     script1.src = chrome.runtime.getURL("libs/jspdf.umd.min.js");
//     alert("Source: " + script1.src);
//     document.body.appendChild(script1);
//     await new Promise((r) => (script1.onload = r));
//   }

//   alert("After jsPDF load → " + typeof window.jspdf);

//   // Load autoTable plugin only after jsPDF is present
//   if (window.jspdf && typeof window.jspdf.jsPDF.API.autoTable === "undefined") {
//     let script2 = document.createElement("script");
//     script2.src = chrome.runtime.getURL("libs/jspdf.plugin.autotable.min.js");
//     document.body.appendChild(script2);
//     await new Promise((r) => (script2.onload = r));
//   }

//   alert("After autoTable load → " + typeof window.jspdf?.jsPDF?.API?.autoTable);

//   // Test PDF
//   if (window.jspdf) {
//     const { jsPDF } = window.jspdf;
//     const doc = new jsPDF();
//     doc.text("Hello from jsPDF", 10, 10);
//     doc.save("test.pdf");
//   }
// })();
