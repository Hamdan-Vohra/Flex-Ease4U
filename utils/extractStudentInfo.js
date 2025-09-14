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

export function getCampusName(studentInfo) {
  const rollNo = studentInfo
    .find((info) => info.title === "Roll No")
    .value.split("-");
  const initial = rollNo[0][2];
  return campusMap[initial] ? campusMap[initial] : "New Campus";
}
