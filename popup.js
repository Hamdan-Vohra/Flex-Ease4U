import { extractStudentInfo } from "./utils/studentdetails.js";
import { nuLogoBase64 } from "./utils/nuLogo.js"; // base64 logo
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
  marginTop: 15,
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
  // if (chrome && chrome.storage && chrome.storage.local) {
  //   chrome.storage.local.get("studentInfo", (result) => {
  //     if (result.studentInfo) {
  //       studentInfo = result.studentInfo;
  //       console.log("Loaded studentInfo from storage:", studentInfo);
  //     }
  //   });
  // } else {
  //   console.warn("chrome.storage.local is not available.");
  // }

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
        // chrome.storage.local.set({ studentInfo }); // persist
        console.log("Student Info:", studentInfo);
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
          if (!studentInfo) {
            // studentInfo = extractStudentInfo(dom,url);
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: "showInstructionModal",
                message:
                  "Please go to the Home page first to extract student details.",
              });
            });
            return;
          }
          const { jsPDF } = window.jspdf;
          const doc = new jsPDF();

          // Transcript Header
          setHeader(doc);

          // Student Information
          setStudentInfo(doc);
          // Transcript Table

          // doc.autoTable({
          //   head: [["Field", "Value"]],
          //   body: tableData,
          //   startY: 75,
          //   theme: "grid",
          //   headStyles: { fillColor: [0, 51, 102] }, // navy-blue header
          //   styles: { fontSize: 11, cellPadding: 4 },
          // });

          // 🔹 Save PDF
          doc.save("student_info.pdf");
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

  // Interim Transcript Title
  doc.setFont(masterData.font, "bold");
  doc.setFontSize(masterData.headingSize.large);
  doc.setTextColor(0, 51, 102); // light navy-blue (RGB)
  doc.text("INTERIM TRANSCRIPT", pageWidth / 2, 55, {
    align: "center",
  });

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Horizontal Line
  doc.setLineWidth(0.5);
  doc.line(10, 65, pageWidth - 10, 65);

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
  doc.text(finalName, pageWidth / 2, 72, {
    align: "center",
  });

  // Reset font
  doc.setFont(masterData.font, "normal");
  doc.setFontSize(masterData.textSize.normal);
}

function setStudentInfo(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = masterData.marginLeft;
  const marginRight = masterData.marginLeft;
  const colGap = 10; // gap between columns
  const lineHeight = 5;
  const startY = 80;

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
}
