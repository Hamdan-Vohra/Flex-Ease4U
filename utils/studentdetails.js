const campusMap = {
  I: "Islamabad Campus",
  K: "Karachi Campus",
  F: "Faisalabad Campus",
  L: "Lahore Campus",
  P: "Peshawar Campus",
  M: "Multan Campus",
};

export function extractStudentInfo(dom) {
  const studentInfo = [];

  // Helper to extract fields from a given portlet title
  function extractFieldsByPortletTitle(title) {
    const portlet = Array.from(dom.querySelectorAll('.m-portlet')).find(p => {
      const headText = p.querySelector('.m-portlet__head-text');
      return headText && headText.textContent.trim() === title;
    });
    if (!portlet) return;

    const infoRows = portlet.querySelectorAll('.m-portlet__body .row > div');
    infoRows.forEach(col => {
      // Each <p> contains a field
      col.querySelectorAll('p').forEach(p => {
        const spans = p.querySelectorAll('span');
        if (spans.length >= 2) {
          const field = spans[0].textContent.replace(':', '').trim();
          const value = spans[1].textContent.trim();
          studentInfo.push({ title: field, value });
        }
      });
    });
  }

  // Extract from both sections
  extractFieldsByPortletTitle('Personal Information');
  extractFieldsByPortletTitle('University Information');

  return studentInfo;
}

export function getCampusName(studentInfo) {
  const rollNo = studentInfo
    .find((info) => info.title === "Roll No")
    .value.split("-");
  const initial = rollNo[0][2];
  return campusMap[initial] ? campusMap[initial] : "New Campus";
}
