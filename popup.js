import { extractStudentInfo } from "./utils/studentdetails.js";
import { nuLogoBase64 } from "./utils/nuLogo.js"; // base64 logo
import { extractTranscriptSemesters } from "./utils/transcriptdetails.js";

const masterData = {
  campusMap: {
    I: "Islamabad Campus",
    K: "Karachi Campus",
    F: "Faisalabad Campus",
    L: "Lahore Campus",
    P: "Peshawar Campus",
    M: "Multan Campus",
  },
  programMap: {
    CS: "Computer Science",
    SE: "Software Engineering",
    CY: "Cyber Security",
    DS: "Data Science",
    AI: "Artificial Intelligence",
    EE: "Electrical Engineering",
  },
  degreeMap: {
    BS: "Bachelor of Science",
    BBA: "Bachelor of Business Administration",
    MBA: "Master of Business Administration",
    MSc: "Master of Science",
    PhD: "Doctor of Philosophy",
  },
  textSize: {
    small: 8,
    normal: 11,
    large: 14,
  },
  headingSize: {
    small: 12,
    normal: 16,
    large: 20,
  },
  font: "helvetica",
  logoWidth: 35,
  logoHeight: 35,
  marginTop: 10,
  marginLeft: 10,
};
let studentInfo = null;

document.addEventListener("DOMContentLoaded", function () {
  (async () => {
    // Load autoTable plugin only after jsPDF is present
    if (
      window.jspdf &&
      typeof window.jspdf.jsPDF.API.autoTable === "undefined"
    ) {
      let script2 = document.createElement("script");
      script2.src = chrome.runtime.getURL("libs/jspdf.plugin.autotable.min.js");
      document.body.appendChild(script2);
      await new Promise((r) => (script2.onload = r));
    }
    console.log(
      "After autoTable load → ",
      typeof window.jspdf?.jsPDF?.API?.autoTable
    );
  })();

  // Load  persisted states from Local Storage
  if (chrome && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get("studentInfo", (result) => {
      if (result.studentInfo) {
        studentInfo = result.studentInfo;
        console.log("Loaded studentInfo from storage:", studentInfo);
      }
    });
  } else {
    console.warn("chrome.storage.local is not available.");
  }

  //listening for button click
  document.getElementById("get-details").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "getContent" }, (response) => {
      if (response.success) {
        const HTMLcontent = response.content;
        const url = response.url;
        try {
          const u = new URL(url);
          if (
            !(
              u.origin === "https://flexstudent.nu.edu.pk" && u.pathname === "/"
            )
          ) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: "showInstructionModal",
                message:
                  "To extract the student details, please go to the Home page.",
              });
            });
            return;
          }
        } catch (e) {
          console.error("Invalid URL:", url);
        }
        const dom = new DOMParser().parseFromString(HTMLcontent, "text/html");

        studentInfo = extractStudentInfo(dom, url);
        // Persist to chrome.storage.local
        if (chrome && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ studentInfo }, () => {
            console.log("Student Info saved to chrome.storage.local");
          });
        } else {
          console.warn("chrome.storage.local is not available.");
        }
        console.log("Extracted Student Info:", studentInfo);
      } else {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "showInstructionModal",
            message: "Reload Page.",
          });
        });
      }
    });
  });

  document
    .getElementById("download-transcript")
    .addEventListener("click", async () => {
      chrome.runtime.sendMessage({ action: "getContent" }, (response) => {
        if (response.success) {
          const HTMLcontent = response.content;

          const dom = new DOMParser().parseFromString(HTMLcontent, "text/html");
          if (!studentInfo || response.url.indexOf("/Transcript") === -1) {
            // studentInfo = extractStudentInfo(dom,url);
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: "showInstructionModal",
                message:
                  "Please go to the Home page first to extract student details. Then try downloading the transcript from the Transcript Page.",
              });
            });
            return;
          }
          const { jsPDF } = window.jspdf;
          const doc = new jsPDF({ format: "legal", unit: "mm" });
          let y = 60;
          // Transcript Header
          y = setHeader(doc);

          // Student Information
          const tableStart = setStudentInfo(doc, y);

          // Transcript Table
          const semesters = extractTranscriptSemesters(dom);

          //Display Tables on PDF
          setSemestersTable(semesters, tableStart, doc);

          // Footer
          setFooter(doc);

          // Save PDF
          doc.save("student_transcript.pdf");
        } else {
          console.error("Error fetching content:", response.error);
        }
      });
    });
});

function setHeader(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  // Logo
  doc.addImage(
    nuLogoBase64,
    "PNG",
    masterData.marginLeft,
    masterData.marginTop,
    masterData.logoWidth,
    masterData.logoHeight
  );

  // University Name next to logo
  console.log(studentInfo["Campus"]);
  const campus =
    studentInfo.find((item) => item.title === "Campus")?.value || "New";
  doc.setFont(masterData.font, "bold");
  doc.setFontSize(masterData.headingSize.normal);
  doc.text(
    "National University of Computer & Emerging Sciences",
    masterData.marginLeft + masterData.logoWidth + 5,
    masterData.marginTop + masterData.logoWidth / 2 - 2
  );

  doc.setFont(masterData.font, "normal");
  doc.setFontSize(masterData.textSize.normal);
  doc.text(
    campus + " Campus",
    masterData.marginLeft + masterData.logoWidth + 5,
    masterData.marginTop + masterData.logoWidth / 2 + 5
  );

  let y = masterData.marginTop + masterData.logoHeight + 10;
  // Interim Transcript Title
  doc.setFont(masterData.font, "bold");
  doc.setFontSize(masterData.headingSize.large);
  doc.setTextColor(0, 51, 102); // light navy-blue (RGB)
  doc.text("INTERIM TRANSCRIPT", pageWidth / 2, y - 5, {
    align: "center",
  });

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Horizontal Line
  doc.setLineWidth(0.5);
  doc.line(10, y, pageWidth - 10, y);

  doc.setFontSize(masterData.headingSize.small);
  const degreeName =
    studentInfo.find((item) => item.title === "Degree")?.value || "Unknown";
  const degree = degreeName.split("(");
  const programCode =
    degree.length > 1 ? degree[1].replace(")", "") : "Unknown";
  console.log(programCode);
  console.log(degree[0]);
  const programFullName =
    masterData.programMap[programCode] || "Unknown Program";
  const degreeFullName = masterData.degreeMap[degree[0]] || "Unknown Degree";
  const finalName = `${degreeFullName} ( ${programFullName} )`;
  y += 5;
  doc.text(finalName, pageWidth / 2, y, {
    align: "center",
  });

  // Reset font
  doc.setFont(masterData.font, "normal");
  doc.setFontSize(masterData.textSize.normal);

  return y;
}

function setStudentInfo(doc, y_start) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = masterData.marginLeft;
  const marginRight = masterData.marginLeft;
  const lineHeight = 5;
  const startY = y_start + 5; // Start below header

  // Map for label overrides
  const labelMap = {
    Name: "Student Name",
    DOB: "Date of Birth",
    "Roll No": "Roll No",
    Batch: "Batch",
    CNIC: "CNIC",
    Gender: "Gender",
    Status: "Status",
    "Reg No": "Reg No",
  };

  // Define which fields to show in each column
  const leftFields = ["Name", "DOB", "CNIC", "Gender"];
  const rightFields = ["Roll No", "Batch", "Roll No", "Status"]; // "Roll No" used for both Roll No and Reg No

  // Helper to get value by field
  function getValue(field) {
    const item = studentInfo.find((info) => info.title === field);
    return item ? item.value : "";
  }

  // Prepare left and right column data
  const leftCol = leftFields.map((field) => ({
    label: labelMap[field] || field,
    value: getValue(field),
  }));

  // For Reg No, use Roll No value but label as Reg No
  const rightCol = [
    { label: "Roll No", value: getValue("Roll No") },
    { label: "Batch", value: getValue("Batch") },
    { label: "Reg No", value: getValue("Roll No") },
    { label: "Status", value: getValue("Status") },
  ];

  // X positions
  const leftX = marginLeft;
  const rightX = pageWidth - marginRight;

  // Print left column (left-aligned)
  let y = startY;
  leftCol.forEach((item) => {
    doc.text(`${item.label}: ${item.value}`, leftX, y, { align: "left" });
    y += lineHeight;
  });

  // Print right column (right-aligned)
  y = startY;
  rightCol.forEach((item) => {
    doc.text(`${item.label}: ${item.value}`, rightX, y, { align: "right" });
    y += lineHeight;
  });

  return y;
}

function setSemestersTable(semesters, tableStart, doc) {
  // Two-column layout for semesters
  const pageWidth = doc.internal.pageSize.getWidth();
  const colWidth = (pageWidth - masterData.marginLeft * 2 - 10) / 2;
  let y = tableStart;
  let prevY = y;

  for (let i = 0; i < semesters.length; i += 1) {
    const Sem = semesters[i];

    let sectionHeight = 0;
    // Determine column (left/right)
    const colX =
      i % 2 ? masterData.marginLeft + colWidth + 10 : masterData.marginLeft;
    // Determine start Y position
    const startY = (i % 2 === 0 ? y : prevY) + 5;

    //Semester Name
    doc.setFont(masterData.font, "bold");
    doc.setFontSize(masterData.headingSize.small);
    doc.text(Sem.semesterName, colX, startY);

    // Courses Table
    doc.autoTable({
      startY: startY + 4,
      margin: {
        left: colX,
        right: masterData.marginLeft,
        top: 0,
        bottom: 0,
      },
      tableWidth: colWidth,
      head: [["Code", "Course Title", "Crd", "Pnts", "Grd", "Type"]],
      body: Sem.courses.map((r) => [
        r.Code,
        r.CourseTitle,
        r.Crd,
        r.Pnts,
        r.Grd,
        r.Type,
      ]),
      styles: { fontSize: 7, cellPadding: 1 },
      headStyles: { fillColor: [0, 51, 102] },
      theme: "grid",
      pageBreak: "avoid",
    });

    sectionHeight = doc.lastAutoTable.finalY;

    // Semester's Summary
    let summaryY = sectionHeight + 5;
    doc.setFont(masterData.font, "normal");
    doc.setFontSize(masterData.textSize.small);
    doc.text(
      `Credits Attempted: ${Sem.summary["Cr. Att"] || ""}`,
      colX,
      summaryY
    );
    doc.text(
      `Credits Earned: ${Sem.summary["Cr. Ernd"] || ""}`,
      colX,
      summaryY + 3
    );
    doc.text(`GPA: ${Sem.summary["SGPA"] || ""}`, colX + colWidth, summaryY, {
      align: "right",
    });
    doc.text(
      `CGPA: ${Sem.summary["CGPA"] || ""}`,
      colX + colWidth,
      summaryY + 3,
      { align: "right" }
    );
    sectionHeight = summaryY + 5;

    // Move y to the next row, using the max height of the two columns
    prevY = y;
    y = Math.max(sectionHeight, y);
  }

  // Transcript Summary (custom layout)
  const crdsErnd = semesters.reduce((sum, sem) => {
    const val = parseFloat(sem.summary["Cr. Ernd"]);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
  const crdsAtt = semesters.reduce((sum, sem) => {
    const val = parseFloat(sem.summary["Cr. Att"]);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
  const cgpa =
    semesters.length > 0
      ? semesters[semesters.length - 1].summary["CGPA"] || ""
      : "";

  // If you have percentage, calculate or fetch it here
  const percentage = cgpa ? (parseFloat(cgpa) * 25).toFixed(2) : ""; // Example conversion

  const leftX = masterData.marginLeft;
  const boxWidth = pageWidth - masterData.marginLeft * 2;
  const boxHeight = 16; // Enough for two lines
  const ySummary = y + 5;

  // Draw rectangle for summary
  doc.setDrawColor(0, 51, 102); // navy border
  doc.setLineWidth(0.5);
  doc.rect(leftX, ySummary, boxWidth, boxHeight);

  // Set font and size
  doc.setFont(masterData.font, "bold");
  doc.setFontSize(masterData.textSize.small);

  // First line: Credits Required, Credits Completed, Credits Attempted
  const firstLine = [
    `Credits Required: 130`,
    `Credits Completed: ${crdsErnd}`,
    `Credits Attempted: ${crdsAtt}`,
  ];
  const firstLineSpacing = boxWidth / firstLine.length;

  firstLine.forEach((text, idx) => {
    doc.text(text, 5 + leftX + firstLineSpacing * idx, ySummary + 5);
  });

  // Second line: CGPA Required, CGPA, Percentage
  const secondLine = [
    `CGPA Required: 2.00`,
    `CGPA: ${cgpa}`,
    `Percentage: ${percentage}`,
  ];
  const secondLineSpacing = boxWidth / secondLine.length;

  secondLine.forEach((text, idx) => {
    doc.text(text, 5 + leftX + secondLineSpacing * idx, ySummary + 11);
  });
}

function setFooter(doc) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const footerY = pageHeight - 10;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(10, footerY, pageWidth - 10, footerY);
  doc.setFont(masterData.font, "normal");
  doc.setFontSize(masterData.textSize.small);
  const generationDate = new Date().toLocaleDateString();
  doc.text(
    `Issued Date: ${generationDate}.`,
    pageWidth - masterData.marginLeft,
    footerY + 5,
    {
      align: "right",
    }
  );
}
