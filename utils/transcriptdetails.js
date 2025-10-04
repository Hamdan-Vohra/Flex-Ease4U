export function extractTranscriptSemesters(dom) {
  const semesters = [];
  const transcriptRows = dom.querySelectorAll(
    ".m-portlet__body .m-section__content > .row > .col-md-6"
  );

  transcriptRows.forEach((semesterCol, idx) => {
    // Get semester name
    const semHeader = semesterCol.querySelector("h5");
    const semesterName = semHeader
      ? semHeader.textContent.trim()
      : `Semester ${idx + 1}`;

    // Get summary spans (Cr. Att, Cr. Ernd, CGPA, SGPA)
    const summarySpans = semesterCol.querySelectorAll(".pull-right span");
    let summary = {};
    summarySpans.forEach((span) => {
      const [label, value] = span.textContent.split(":");
      if (label && value) summary[label.trim()] = value.trim();
    });

    // Get table rows
    const table = semesterCol.querySelector("table");
    const courses = [];
    if (table) {
      const trs = table.querySelectorAll("tbody tr");
      trs.forEach((tr) => {
        const tds = tr.querySelectorAll("td");
        if (tds.length >= 8) {
          courses.push({
            Code: tds[0].textContent.trim(),
            CourseTitle: tds[1].textContent.trim(),
            Section: tds[2].textContent.trim(),
            Crd: tds[3].textContent.trim(),
            Grd: tds[4].textContent.trim(),
            Pnts: tds[5].textContent.trim(),
            Type: tds[6].textContent.trim(),
          });
        }
      });
    }

    semesters.push({
      semesterName,
      summary,
      courses,
    });
  });

  return semesters;
}