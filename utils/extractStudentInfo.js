export function extractStudentInfo(dom) {
  const studentInfo = [];
  const infoNodes = dom.querySelectorAll(
    ".m-portlet__body .col-md-2, .m-portlet__body .col-md-3"
  );

  infoNodes.forEach((node) => {
    const titleSpan = node.querySelector(".m--font-boldest");
    const valueSpan = titleSpan ? titleSpan.nextElementSibling : null;
    if (titleSpan && valueSpan) {
      studentInfo.push({
        title: titleSpan.textContent.replace(":", "").trim(),
        value: valueSpan.textContent.trim(),
      });
    }
  });

  return studentInfo;
}
