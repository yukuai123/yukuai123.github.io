function renderExcelData(rowData, { renderHourText, renderMinText }) {
  const tableContentDom = document.querySelector("#table-content");
  const resultContentDom = document.querySelector("#result-content");

  let tableContent = `
            <table border="1" cellspacing="0" cellpadding="0" style="width: 100%; text-align: center;">
              <thead>
                <tr>
                  <th scope="col">日期</th>
                  <th scope="col">工作时长（小时）</th>
                  <th scope="col">工作时长（分钟）</th>
                  <th scope="col">差异值（小时）</th>
                  <th scope="col">差异值（分钟）</th>
                  <th scope="col">上班打卡时间</th>
                  <th scope="col">下班打卡时间</th>
                  <th scope="col">周工作时长（小时）</th>
                  <th scope="col">周工作时长（分钟）</th>
                </tr>
              </thead>
              <tbody>
                ${rowData
                  .map((item) => {
                    return `
                        <tr>
                          <td>${item.workDay}</td>
                          <td>${item.hour}</td>
                          <td>${item.minutes}</td>
                          <td ${
                            item.diffHour > 0
                              ? 'style="color:green"'
                              : 'style="color:red"'
                          }>${item.diffHour}</td>
                          <td ${
                            item.diffMins > 0
                              ? 'style="color:green"'
                              : 'style="color:red"'
                          }>${item.diffMins}</td>
                          <td>${item.startTime}</td>
                          <td>${item.endTime}</td>
                          ${
                            item.rowspan > 0
                              ? `<td rowspan=${item.rowspan}>
                                  <div>
                                    本月第${item.convertWeekNumber}周
                                  </div>
                                  <div style="padding: 8px 0">周工时：${item.weekHour.toFixed(
                                    2
                                  )}h</div>
                                  <div ${
                                    item.diffWeekHour > 0
                                      ? 'style="color:green"'
                                      : 'style="color:red"'
                                  }>
                                    ${
                                      item.diffWeekHour > 0
                                        ? `可调休: ${item.diffWeekHour.toFixed(
                                            2
                                          )}h`
                                        : `工时不足: ${item.diffWeekHour.toFixed(
                                            2
                                          )}h`
                                    }
                                  </div>
                                </td>
                                <td rowspan=${item.rowspan}>
                                  <div>
                                    本月第${item.convertWeekNumber}周
                                  </div>
                                  <div style="padding: 8px 0">周工时：${item.weekMins.toFixed(
                                    2
                                  )}h</div>
                                  <div ${
                                    item.diffWeekMins > 0
                                      ? 'style="color:green"'
                                      : 'style="color:red"'
                                  }>
                                    ${
                                      item.diffWeekMins > 0
                                        ? `可调休: ${item.diffWeekMins.toFixed(
                                            2
                                          )}分钟`
                                        : `工时不足: ${item.diffWeekMins.toFixed(
                                            2
                                          )}分钟`
                                    }
                                  </div>
                                </td>
                            `
                              : ""
                          }
                        </tr>
                      `;
                  })
                  .join("")}
              </tbody>
            </table>
        `;

  let result = `
              <h3 style="margin-top: 20px">
                <span style="font-size: 20px">${renderHourText}</span>
                <span style="font-size: 20px">${renderMinText}</span>
              </h3>`;
  tableContentDom.innerHTML = tableContent;
  resultContentDom.innerHTML = result;
}

(async () => {
  const { excelData, ...restParams } = await chrome.storage.sync.get();
  renderExcelData(excelData, restParams);
})();
