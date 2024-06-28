function renderTipColor(time) {
  if (Number(time) !== Number(time)) return "";
  return time > 0 ? 'style="color:#00B96B"' : 'style="color:#E0282E"';
}

function renderTipText(time, afterText) {
  return time > 0
    ? `可调休: ${time.toFixed(2)}${afterText}`
    : `工时不足: ${time.toFixed(2)}${afterText}`;
}

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
                          <td>${item.workDay} 
                          ${
                            item.isFreeDay
                              ? "<span style=`color: '#F2BD27'`>加班</span>"
                              : ""
                          } 
                          </td>
                          <td>${item.hour}</td>
                          <td>${item.minutes}</td>
                          <td ${renderTipColor(item.diffHour)}>
                              ${item.diffHour}
                          </td>
                          <td ${renderTipColor(item.diffMins)}>
                            ${item.diffMins}
                          </td>
                          <td>
                              ${item.startTime}<br/>
                              ${item.ignoreForgetDK ? "(忘记打卡)" : ""}
                          </td>
                          <td>
                              ${item.endTime}<br/>
                              ${item.ignoreForgetDK ? "(忘记打卡)" : ""}
                          </td>
                          ${
                            item.rowspan > 0
                              ? `<td rowspan=${item.rowspan}>
                                    <div>
                                      本月第${item.convertWeekNumber}周
                                    </div>
                                    <div style="padding: 8px 0">
                                      周工时：${item.weekHour.toFixed(2)}小时
                                    </div>
                                    <div ${renderTipColor(item.diffWeekHour)}>
                                      ${renderTipText(
                                        item.diffWeekHour,
                                        "小时"
                                      )}
                                    </div>
                                  </td>
                                  <td rowspan=${item.rowspan}>
                                    <div>
                                      本月第${item.convertWeekNumber}周
                                    </div>
                                    <div style="padding: 8px 0">
                                      周工时：${item.weekMins.toFixed(2)}分钟
                                    </div>
                                    <div ${renderTipColor(item.diffWeekMins)}>
                                      ${renderTipText(
                                        item.diffWeekMins,
                                        "分钟"
                                      )}
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
