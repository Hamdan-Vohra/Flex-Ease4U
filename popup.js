import { extractStudentInfo } from "./utils/studentdetails.js";
import { nuLogoBase64 } from "./utils/nuLogo.js";
import { extractTranscriptSemesters } from "./utils/transcriptdetails.js";

const FLEX_ORIGIN = "https://flexstudent.nu.edu.pk";

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

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------
function setStatus(message, type) {
  const el = document.getElementById("status");
  if (!el) return;
  el.textContent = message || "";
  el.className = "status" + (type ? " " + type : "");
}

// ---------------------------------------------------------------------------
// Tab / page helpers (run from the popup; popup stays open while the tab navigates)
// ---------------------------------------------------------------------------
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  return tab;
}

// Read the full rendered HTML of a tab.
async function getTabHtml(tabId) {
  const [res] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => document.documentElement.outerHTML,
  });
  return res && res.result;
}

// Navigate a tab to a URL and resolve once it has finished loading.
function navigateAndWait(tabId, url) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => finish(), 20000); // safety timeout

    function finish(err) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(listener);
      err ? reject(err) : resolve();
    }

    function listener(updatedTabId, info) {
      if (updatedTabId === tabId && info.status === "complete") {
        // small buffer so late-rendered assets (e.g. the profile image) settle
        setTimeout(() => finish(), 500);
      }
    }

    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.update(tabId, { url }).catch(finish);
  });
}

// Grab the profile picture from a tab as a Base64 JPEG (waits for it to load).
async function getProfileImageBase64(tabId) {
  const [res] = await chrome.scripting.executeScript({
    target: { tabId },
    func: async () => {
      const imgTag = document.querySelector(".m-topbar__userpic img");
      if (!imgTag) return null;
      if (!imgTag.complete || imgTag.naturalWidth === 0) {
        await new Promise((resolve) => {
          imgTag.addEventListener("load", resolve, { once: true });
          imgTag.addEventListener("error", resolve, { once: true });
          setTimeout(resolve, 2000);
        });
      }
      try {
        const canvas = document.createElement("canvas");
        canvas.width = imgTag.naturalWidth;
        canvas.height = imgTag.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(imgTag, 0, 0);
        return canvas.toDataURL("image/jpeg");
      } catch (e) {
        return null;
      }
    },
  });
  return (res && res.result) || null;
}

// Make sure the autoTable plugin is attached to jsPDF before we build a table.
async function ensureAutoTable() {
  if (window.jspdf && typeof window.jspdf.jsPDF.API.autoTable === "undefined") {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("libs/jspdf.plugin.autotable.min.js");
    document.body.appendChild(script);
    await new Promise((r) => (script.onload = r));
  }
}

// ---------------------------------------------------------------------------
// One-click flow: Home (student details) -> Transcript (semesters) -> PDF
// ---------------------------------------------------------------------------
async function autoDownloadTranscript() {
  const btn = document.getElementById("download-transcript");
  const includePhoto = document.getElementById("include-photo").checked;

  try {
    btn.disabled = true;
    await ensureAutoTable();

    const tab = await getActiveTab();
    if (!tab || !tab.url || !tab.url.startsWith(FLEX_ORIGIN)) {
      setStatus(
        "Open and log in to flexstudent.nu.edu.pk, then try again.",
        "error"
      );
      return;
    }

    // Step 1 — Home page: extract student details + the real Transcript link.
    setStatus("Opening Home page…");
    await navigateAndWait(tab.id, FLEX_ORIGIN + "/");

    setStatus("Extracting student details…");
    const homeDom = new DOMParser().parseFromString(
      await getTabHtml(tab.id),
      "text/html"
    );
    const extracted = await extractStudentInfo(homeDom);
    studentInfo = extracted.studentInfo;
    if (!studentInfo || studentInfo.length === 0) {
      setStatus(
        "Couldn't read student details. Make sure you're logged in.",
        "error"
      );
      return;
    }
    chrome.storage.local.set({ studentInfo });

    // The Transcript nav link carries a `dump` session token — reuse it.
    const link = homeDom.querySelector('a[href*="/Student/Transcript"]');
    const transcriptUrl = link
      ? new URL(link.getAttribute("href"), FLEX_ORIGIN).href
      : FLEX_ORIGIN + "/Student/Transcript";

    // Step 2 — Transcript page: extract the semesters.
    setStatus("Opening Transcript page…");
    await navigateAndWait(tab.id, transcriptUrl);

    setStatus("Reading transcript…");
    const transcriptDom = new DOMParser().parseFromString(
      await getTabHtml(tab.id),
      "text/html"
    );
    const semesters = extractTranscriptSemesters(transcriptDom);
    if (!semesters || semesters.length === 0) {
      setStatus("No transcript data found on the Transcript page.", "error");
      return;
    }

    // Step 3 — Build and save the PDF.
    setStatus("Generating PDF…");
    await generateTranscriptPdf(semesters, includePhoto, tab.id);
    setStatus("Transcript downloaded ✓", "success");
  } catch (err) {
    console.error("Auto download failed:", err);
    setStatus("Something went wrong: " + (err?.message || err), "error");
  } finally {
    btn.disabled = false;
  }
}

async function generateTranscriptPdf(semesters, includePhoto, tabId) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ format: "legal", unit: "mm" });

  // Transcript Header
  let y = setHeader(doc);

  // Student Information (optionally with profile photo)
  const tableStart = await setStudentInfo(doc, y, includePhoto, tabId);

  // Display Tables on PDF
  setSemestersTable(semesters, tableStart, doc);

  // Footer
  setFooter(doc);

  // Save PDF
  const rollNo = studentInfo.find((i) => i.title === "Roll No")?.value;
  doc.save(`transcript_${rollNo || "student"}.pdf`);
}

document.addEventListener("DOMContentLoaded", function () {
  // Restore the "include photo" preference.
  if (chrome?.storage?.local) {
    chrome.storage.local.get("includePhoto", (result) => {
      if (typeof result.includePhoto === "boolean") {
        document.getElementById("include-photo").checked = result.includePhoto;
      }
    });
  }

  // Persist the toggle whenever it changes.
  document.getElementById("include-photo").addEventListener("change", (e) => {
    chrome.storage?.local?.set({ includePhoto: e.target.checked });
  });

  // One-click: fetch details + transcript and download, from any page.
  document
    .getElementById("download-transcript")
    .addEventListener("click", autoDownloadTranscript);

  // Remove right-click / dev-tools block script on the current page.
  document
    .getElementById("remove-block-script")
    .addEventListener("click", () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "removeBlockScript" },
          (response) => {
            if (response && response.success) {
              setStatus("Block script removed.", "success");
            } else {
              setStatus("Failed to remove block script.", "error");
            }
          }
        );
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

async function setStudentInfo(doc, y_start, includePhoto, tabId) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = masterData.marginLeft;
  const centerX = pageWidth / 2 + 5;
  const leftlabelWidth = 26;
  const rightlabelWidth = 15;
  const valueGap = 2;
  const lineHeight = 4;
  const startY = y_start + 10;

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
  const rightFields = ["Roll No", "Batch", "Reg No", "Status"];

  // Helper to get value by field
  function getValue(field) {
    const item = studentInfo.find((info) => info.title === field);
    if (field === "DOB" && item && item.value) {
      return formatDOB(item.value);
    }
    return item ? item.value : "";
  }

  // Print left column (labels and values aligned)
  let y = startY;
  leftFields.forEach((field) => {
    const label = labelMap[field] || field;
    const value = getValue(field);
    doc.setFont(masterData.font, "bold");
    doc.text(label + ":", marginLeft, y, { align: "left" });
    doc.setFont(masterData.font, "normal");
    doc.text(value, marginLeft + leftlabelWidth + valueGap, y, {
      align: "left",
    });
    y += lineHeight;
  });

  // Print right column (labels and values aligned, starting from center)
  y = startY;
  rightFields.forEach((field) => {
    const label = labelMap[field] || field;
    const value = getValue(field);
    doc.setFont(masterData.font, "bold");
    doc.text(label + ":", centerX, y, { align: "left" });
    doc.setFont(masterData.font, "normal");
    doc.text(value, centerX + rightlabelWidth + valueGap, y, { align: "left" });
    y += lineHeight;
  });

  // Profile photo (only when the toggle is on)
  if (includePhoto) {
    const imgWidth = 22;
    const imgHeight = 26;
    const imgX = pageWidth - masterData.marginLeft - imgWidth;
    const imgY = y_start;
    await addProfileImage(doc, imgX, imgY, imgWidth, imgHeight, tabId);
  }

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
  const crdsErnd =
  semesters.length > 0
    ? parseFloat(semesters[semesters.length - 1].summary["Cr. Ernd"]) || 0
    : 0;

  const crdsAtt =
  semesters.length > 0
    ? parseFloat(semesters[semesters.length - 1].summary["Cr. Att"]) || 0
    : 0;

  const cgpa =
    semesters.length > 0
      ? semesters[semesters.length - 1].summary["CGPA"] || ""
      : "";

  // If you have percentage, calculate or fetch it here
  const percentage = cgpa ? (parseFloat(cgpa) * 25).toFixed(2) : "";

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

function formatDOB(dobStr) {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const [month, day, year] = dobStr.split("/");
  if (!month || !day || !year) return dobStr;
  return `${months[parseInt(month, 10) - 1]} ${parseInt(day, 10)}, ${year}`;
}

async function addProfileImage(doc, x, y, width, height, tabId) {
  const base64 = await getProfileImageBase64(tabId);
  if (base64) {
    try {
      doc.addImage(base64, "JPEG", x, y, width, height);
    } catch (e) {
      console.warn("Could not add profile image to PDF:", e);
    }
  } else {
    console.warn("Profile image not found.");
  }
}
