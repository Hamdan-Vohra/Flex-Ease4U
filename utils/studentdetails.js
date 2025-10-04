export async function extractStudentInfo(dom) {
  const studentInfo = [];

  // Helper to extract fields from a given portlet title
  function extractFieldsByPortletTitle(title) {
    const portlet = Array.from(dom.querySelectorAll(".m-portlet")).find((p) => {
      const headText = p.querySelector(".m-portlet__head-text");
      return headText && headText.textContent.trim() === title;
    });
    if (!portlet) return;

    const infoRows = portlet.querySelectorAll(".m-portlet__body .row > div");
    infoRows.forEach((col) => {
      // Each <p> contains a field
      col.querySelectorAll("p").forEach((p) => {
        const spans = p.querySelectorAll("span");
        if (spans.length >= 2) {
          const field = spans[0].textContent.replace(":", "").trim();
          const value = spans[1].textContent.trim();
          studentInfo.push({ title: field, value });
        }
      });
    });
  }

  // Extract from both sections
  extractFieldsByPortletTitle("Personal Information");
  extractFieldsByPortletTitle("University Information");

  return { studentInfo };
}
