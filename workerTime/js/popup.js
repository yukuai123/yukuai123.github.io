import Storage from "../utils/storage";
import { AUTH_LINK } from "../utils/consts";
import { chromeRuntimeSendMessage } from "../utils/native";

function load() {
  /** 导出报表 */
  const btn = document.getElementById("submit");
  /** 选择月份 */
  const select = document.getElementById("selectedMonth");
  /** 是否包含今天内容 */
  const includeDay = document.getElementById("includesDay");
  /** 授权链接按钮 */
  const link = document.getElementById("link");
  /** 在线计算时长展示在popup.html上的按钮 */
  const calcBtn = document.getElementById("calc");
  /** 渲染在popup.html上时长的内容 */
  const calcContent = document.getElementById("calcContent");
  /** 在线按钮 */
  const calcOnline = document.getElementById("calcOnline");
  /** 是否忽略未打卡时间 */
  const ignoreForgetDK = document.getElementById("ignoreForgetDK");

  btn.onclick = () => chromeRuntimeSendMessage({ type: "start" });

  calcBtn.onclick = () => {
    chromeRuntimeSendMessage(
      {
        type: "calc",
      },
      (data) => {
        const payload = data.payload || {};
        calcContent.innerHTML = `<div>${payload.renderHourText}</div><div>${payload.renderMinText}</div>`;
      }
    );
  };

  calcOnline.onclick = () => chromeRuntimeSendMessage({ type: "calcOnline" });

  link.onclick = () => window.open(AUTH_LINK);

  /** 初始化配置 */
  const initConfig = async () => {
    let defaultMonth = Number(new Date().getMonth()) + 1;
    let defaultIncludeDay = false;
    let defaultIgnoreForgetDK = false;

    const {
      month,
      includeDay: storeIncludeDay,
      ignoreForgetDK: storeIgnoreForgetDK,
    } = await Storage.get();

    if (month !== undefined) {
      defaultMonth = month;
    }

    if (storeIncludeDay !== undefined) {
      defaultIncludeDay = storeIncludeDay;
    }

    if (storeIgnoreForgetDK !== undefined) {
      defaultIgnoreForgetDK = storeIgnoreForgetDK;
    }

    select.value = defaultMonth;
    includeDay.checked = defaultIncludeDay;
    ignoreForgetDK.checked = defaultIgnoreForgetDK;

    Storage.update("month", defaultMonth);
    Storage.update("includeDay", defaultIncludeDay);
    Storage.update("ignoreForgetDK", defaultIgnoreForgetDK);

    select.onchange = (e) => Storage.update("month", e.target.value);
    includeDay.onchange = (e) => Storage.update("includeDay", e.target.checked);
    ignoreForgetDK.onchange = (e) =>
      Storage.update("ignoreForgetDK", e.target.checked);
  };

  /** 加载事件 */
  document.addEventListener("DOMContentLoaded", initConfig);
  document.addEventListener("beforeunload", () => {
    Storage.remove(["month", "includeDay", "ignoreForgetDK"]);
  });
}

load();
