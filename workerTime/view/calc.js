function renderTipColor(time) {
  if (Number(time) !== Number(time)) return "";
  return time > 0 ? 'style="color:#00B96B"' : 'style="color:#E0282E"';
}

function renderTipText(time, afterText) {
  return time > 0
    ? `可调休: ${time.toFixed(2)}${afterText}`
    : `工时不足: ${time.toFixed(2)}${afterText}`;
}

function beforeChangeDate(date1) {
  return new Date(date1).getTime() < new Date("2024-08-26").getTime()
}

function renderExcelData(rowData, { renderHourText, renderMinText, forceFreeTotalTime, forceFreeTotalMins }) {
  const tableContentDom = document.querySelector("#table-content");

  let tableContent = `
            <table border="1" cellspacing="0" cellpadding="0" style="width: 100%; text-align: center;">
              <thead>
                <tr>
                  <th colspan="4">
                    <div class="flex items-center justify-center">
                      工时概览： <span style="font-weight: bold;">${renderHourText} ${renderMinText}</span>
                      ${renderHourText.includes("工时不足")  ? '<img style="margin-left: 6px" width="16px" src="./images/hjb.svg"/>' :'<img width="16px" src="./images/jb.svg"/>'}
                    </div>
                  </th>

                  <th colspan="2">当前日工时：8.5小时 (${8.5 * 60}分钟)</th>

                  <th colspan="4">
                    <div class="flex items-center justify-center">
                      <img width="16px" src="./images/cd.svg" style="margin-right: 6px;"/>
                      月休假时长：${forceFreeTotalTime || 0}小时 ${forceFreeTotalMins || 0}分钟
                    </div>
                  </th>
                </tr>
                <tr>
                  <th scope="col">日期</th>
                  <th scope="col">工作时长(小时)</th>
                  <th scope="col">工作时长(分钟)</th>
                  <th scope="col">差异值(小时)</th>
                  <th scope="col">差异值(分钟)</th>
                  <th scope="col">上班打卡时间</th>
                  <th scope="col">下班打卡时间</th>
                  <th scope="col">请假时长</th>
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
                          <td>
                            ${item.hour}
                          </td>
                          <td>
                            ${item.minutes}
                          </td>
                          <td ${renderTipColor(item.diffHour)}>
                              ${item.diffHour}
                          </td>
                          <td ${renderTipColor(item.diffMins)}>
                             ${item.diffMins}
                          </td>
                          <td>
                              ${item.startTime}<br/>
                              ${item.ignoreForgetDK ? "(忘记打卡)" : ""}
                              ${item.forceFreeBeginTime ? `<br />${item.forceFreeBeginTime}(请假)` : ""}
                          </td>
                          <td>
                              ${item.endTime}<br/>
                              ${item.ignoreForgetDK ? "(忘记打卡)" : ""}
                              ${item.forceFreeBeginTime ? `<br />${item.forceFreeEndTime}(请假)` : ""}
                          </td>
                          <td>
                              ${item.forceFreeTotalTime ? item.forceFreeTotalTime + "小时<br/>" : "-"}
                              ${item.forceFreeTotalMins ? item.forceFreeTotalMins + "分钟" : ""}
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

  tableContentDom.innerHTML = tableContent;
}

(async () => {
  const { excelData, ...restParams } = await chrome.storage.sync.get();
  renderExcelData(excelData, restParams);
})();
