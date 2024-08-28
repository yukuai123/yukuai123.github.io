function renderTipColor(time, styleStr) {
  if (Number(time) !== Number(time)) return "";
  return time > 0
    ? `style="color:#00B96B;${styleStr}"`
    : `style="color:#E0282E;${styleStr}"`;
}

function renderTipText(time, afterText) {
  return time > 0
    ? `可调休: ${time.toFixed(2)}${afterText}`
    : `工时不足: ${time.toFixed(2)}${afterText}`;
}

function beforeChangeDate(date1) {
  return new Date(date1).getTime() < new Date("2024-08-26").getTime();
}

function curDateWorkTime() {
  if (beforeChangeDate()) {
    return `9小时`;
  } else {
    return `8小时30分钟`;
  }
}

function djs() {
  // 假设我们有一个目标时间点，以毫秒为单位
  const targetTime = new Date(
    `${new Date().toDateString()} 17:30:00`
  ).getTime();

  // 获取当前时间
  const currentTime = new Date().getTime();

  // 计算剩余时间（毫秒）
  let timeDifference = targetTime - currentTime;

  // 倒计时函数
  function countdown() {
    // 剩余时间（毫秒）
    const remainingTime = timeDifference;

    // 计算天、小时、分钟和秒
    const hours = Math.floor(
      (remainingTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor(
      (remainingTime % (1000 * 60 * 60)) / (1000 * 60)
    );
    const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);

    // 显示倒计时结果
    document.querySelector(
      "#time"
    ).innerHTML = `距离下班还有：<span style="text-align: left; display: inline-block; font-size: 20px; min-width: 264px">${hours}小时 ${minutes}分钟 ${seconds}秒</span>`;

    // 更新剩余时间
    timeDifference -= 1000;

    // 如果倒计时结束，清除定时器
    if (timeDifference <= 0) {
      document.querySelector("#time").innerHTML = `别卷了，回去休息！`;
      try {
        countdownInterval && clearInterval(countdownInterval);
      } catch (e) {}
    }
  }

  // 每一秒调用一次 countdown 函数
  countdown();
  const countdownInterval = setInterval(countdown, 1000);

  return () => {
    countdownInterval && clearInterval(countdownInterval);
  };
}

function renderExcelData(
  rowData,
  { convertForceFreeTotalMins, renderConvertTimeText, convertDiffTime }
) {
  const tableContentDom = document.querySelector("#table-content");

  const enoughTime = !renderConvertTimeText?.includes("工时不足");
  let tableContent = `
            <table border="1" cellspacing="0" cellpadding="0" style="width: 100%; text-align: center;">
              <thead>
                <tr>
                  <th colspan="2">
                    <div class="flex items-center justify-center">
                      工时概览：
                        <span ${renderTipColor(
                          enoughTime ? 1 : 0,
                          "font-size: 18px;"
                        )}>
                          ${
                            enoughTime ? "可调休" : "工时不足"
                          } ${convertDiffTime}
                        <span>
                      ${
                        enoughTime
                          ? '<img width="16px" src="./images/jb.svg"/>'
                          : '<img style="margin-left: 6px" width="16px" src="./images/hjb.svg"/>'
                      }
                    </div>
                  </th>

                  <th colspan="2">当前日工时：<span style="font-size: 18px;">${curDateWorkTime()}</span></th>

                  <th colspan="2">
                    <div class="flex items-center justify-center">
                      月休假时长：<span style="font-size: 18px;">${
                        convertForceFreeTotalMins || 0
                      }</span>
                    </div>
                  </th>

                  <th colspan="3">
                    <div id="time"></div>
                  </th>
                </tr>
                <tr>
                  <th scope="col">日期</th>
                  <th scope="col">工作时长(格式化)</th>
                  <th scope="col">工作时长(原始数据)</th>
                  <th scope="col">差异值</th>
                  <th scope="col">上班打卡时间</th>
                  <th scope="col">下班打卡时间</th>
                  <th scope="col">请假时长</th>
                  <th scope="col">周工作时长</th>
                </tr>
              </thead>
              <tbody>
                ${rowData
                  .map((item) => {
                    return `
                        <tr>
                          <td>
                            ${item.workDay}
                            ${
                              item.isFreeDay
                                ? "<span style=`color: '#F2BD27'`>加班</span>"
                                : ""
                            }
                          </td>
                          <td>
                            ${item.convertTime}
                          </td>
                          <td>
                            ${item.hour}(h)<br />
                            ${item.minutes}(mins)
                          </td>
                          <td ${renderTipColor(item.diffHour)}>
                            ${item.convertDiffTime}
                          </td>
                          <td>
                            ${item.startTime}<br/>
                            ${item.ignoreForgetDK ? "(忘记打卡)" : ""}
                            ${
                              item.forceFreeBeginTime
                                ? `<br />${item.forceFreeBeginTime}(请假)`
                                : ""
                            }
                          </td>
                          <td>
                            ${item.endTime}<br/>
                            ${item.ignoreForgetDK ? "(忘记打卡)" : ""}
                            ${
                              item.forceFreeBeginTime
                                ? `<br />${item.forceFreeEndTime}(请假)`
                                : ""
                            }
                          </td>
                          <td>
                            ${item.convertForceFreeTotalTime || "-"}
                          </td>
                          ${
                            item.rowspan > 0
                              ? `<td rowspan=${item.rowspan}>
                                    <div>
                                      本月第${item.convertWeekNumber}周
                                    </div>
                                    <div style="padding: 8px 0">
                                      周工时：${item.convertWeekTime}
                                    </div>
                                    <div ${renderTipColor(item.diffWeekHour)}>
                                      ${
                                        item.diffWeekHour > 0
                                          ? `可调休：${item.convertDiffWeekTime}`
                                          : `工时不足：${item.convertDiffWeekTime}`
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

  tableContentDom.innerHTML = tableContent;
}

function showCutDownTime() {
  let clear = () => {};
  const djsHandler = () => {
    clear();
    clear = djs();
  };
  djsHandler();
  document.addEventListener("visibilitychange", djsHandler);
}

const fontClassEnum = {
  normal: "normal-font",
  zpix: "zpix-font",
};
const fontClassText = {
  [fontClassEnum.normal]: "普通字体",
  [fontClassEnum.zpix]: "像素字体",
};
async function fontChangeControl() {
  const { fontClass: localFontClass, ...params } =
    await chrome.storage.local.get();
  const fontChangeDom = document.querySelector("#fontChange");
  const curFontDom = document.querySelector("#curFont");

  const fontClass = localFontClass || fontClassEnum.normal;
  curFontDom.innerHTML = fontClassText[fontClass];
  document.body.classList.add(fontClass);

  fontChangeDom.onclick = async () => {
    const { fontClass: localFontClass } = await chrome.storage.local.get();
    const fontClass = localFontClass || fontClassEnum.normal;

    const curClass =
      fontClassEnum.zpix === fontClass
        ? fontClassEnum.normal
        : fontClassEnum.zpix;

    chrome.storage.local.set({ ...params, fontClass: curClass });

    curFontDom.innerHTML = fontClassText[curClass];

    fontClass && document.body.classList.remove(fontClass);
    document.body.classList.add(curClass);
  };
}

const fontSizeEnum = {
  "font-14": "font-14",
  "font-15": "font-15",
  "font-16": "font-16",
};

async function fontSizeChangeControl() {
  function setDomActive(activeClass) {
    const parentDom = document.querySelector("#fontSizeChange");
    const childrenDomList = [...parentDom.querySelectorAll("span")];
    childrenDomList.forEach((i) => {
      if (i.dataset.customkey !== activeClass) {
        i.classList.remove("font-active");
      } else {
        i.classList.add("font-active");
      }
    });
  }

  function setBodyFontSize(curFontSize) {
    document.body.classList.remove(...Object.keys(fontSizeEnum));
    document.body.classList.add(curFontSize);
  }

  const parentDom = document.querySelector("#fontSizeChange");
  const childrenDomList = [...parentDom.querySelectorAll("span")];

  const { fontSize: localFontSize } = await chrome.storage.local.get();
  const curFontSize = localFontSize || fontSizeEnum["font-14"];
  setDomActive(curFontSize);
  setBodyFontSize(curFontSize);

  childrenDomList.forEach((dom) => {
    dom.onclick = async (e) => {
      const curFontSize = e.target.dataset.customkey;
      const params = await chrome.storage.local.get();

      setDomActive(curFontSize);
      setBodyFontSize(curFontSize);

      chrome.storage.local.set({ ...params, fontSize: curFontSize });
    };
  });
}

(async () => {
  const { excelData, ...restParams } = await chrome.storage.local.get();
  renderExcelData(excelData, restParams);
  showCutDownTime();
  fontChangeControl();
  fontSizeChangeControl();
})();
