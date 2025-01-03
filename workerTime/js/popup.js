import Storage from "../utils/storage";
import { AUTH_LINK } from "../utils/consts";
import { genYearList } from "../utils/tools";
import { chromeRuntimeSendMessage, isExistValidTab } from "../utils/native";

function genYearOptions() {
  const yearList = genYearList();
  const selectYear = document.getElementById("selectedYear");

  yearList.forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.text = year;
    selectYear.appendChild(option);
  });
}

function load() {
  /** 导出报表 */
  const exportExcelBtn = document.getElementById("submit");
  /** 选择月份 */
  const selectMonth = document.getElementById("selectedMonth");
  /** 是否包含今天内容 */
  const includeDay = document.getElementById("includesDay");
  /** 授权链接按钮 */
  const link = document.getElementById("link");
  /** 在线计算时长展示在popup.html上的按钮 */
  const calcBtn = document.getElementById("calc");
  /** 渲染在popup.html上时长的内容 */
  const calcContent = document.getElementById("calcContent");
  /** 在线查看报表按钮 */
  const calcOnline = document.getElementById("calcOnline");
  /** 是否忽略未打卡时间 */
  const ignoreForgetDK = document.getElementById("ignoreForgetDK");
  /** 是否自动打开报表 */
  const autoOpen = document.getElementById("autoOpenTable");
  /** 年份选择 */
  const selectYear = document.getElementById("selectedYear");
  /** loading */
  const loading = document.getElementById("loading");

  genYearOptions();

  exportExcelBtn.onclick = async () => {
    const isExist = await isExistValidTab();
    if (!isExist) {
      return window.open(AUTH_LINK);
    }
    loading.style.display = "flex";
    chromeRuntimeSendMessage({ type: "exportExcel" }, () => {
      loading.style.display = "none";
    });
  };

  calcBtn.onclick = async () => {
    const isExist = await isExistValidTab();
    if (!isExist) {
      return window.open(AUTH_LINK);
    }
    loading.style.display = "flex";
    chromeRuntimeSendMessage(
      {
        type: "calc",
      },
      (data) => {
        loading.style.display = "none";
        const payload = data.payload || {};
        calcContent.innerHTML = `<div>${payload.renderHourText}</div><div>${payload.renderMinText}</div>`;
      }
    );
  };

  calcOnline.onclick = async () => {
    const isExist = await isExistValidTab();
    if (!isExist) {
      return window.open(AUTH_LINK);
    }
    loading.style.display = "flex";
    chromeRuntimeSendMessage({ type: "calcOnline" }, () => {
      loading.style.display = "none";
    });
  };

  link.onclick = () => window.open(AUTH_LINK);

  /** 初始化配置 */
  const initConfig = async () => {
    let defaultMonth = Number(new Date().getMonth()) + 1;
    let defaultYear = Number(new Date().getFullYear());
    let defaultIncludeDay = false;
    let defaultIgnoreForgetDK = false;
    let defaultAutoOpenTable = false;

    const {
      month: storeMonth,
      year: storeYear,
      includeDay: storeIncludeDay,
      ignoreForgetDK: storeIgnoreForgetDK,
      autoOpenTable: storeAutoOpenTable,
    } = await Storage.get();

    if (storeIncludeDay !== undefined) {
      defaultIncludeDay = storeIncludeDay;
    }

    if (storeIgnoreForgetDK !== undefined) {
      defaultIgnoreForgetDK = storeIgnoreForgetDK;
    }

    if (storeAutoOpenTable !== undefined) {
      defaultAutoOpenTable = storeAutoOpenTable;
    }

    if (storeMonth !== undefined) {
      defaultMonth = storeMonth;
    }

    if (storeYear !== undefined) {
      defaultYear = storeYear;
    }

    selectMonth.value = defaultMonth;
    selectYear.value = defaultYear;
    includeDay.checked = defaultIncludeDay;
    ignoreForgetDK.checked = defaultIgnoreForgetDK;
    autoOpenTable.checked = defaultAutoOpenTable;

    Storage.update("month", defaultMonth);
    Storage.update("year", defaultYear);
    Storage.update("includeDay", defaultIncludeDay);
    Storage.update("ignoreForgetDK", defaultIgnoreForgetDK);
    Storage.update("autoOpenTable", defaultAutoOpenTable);

    selectMonth.onchange = (e) => Storage.update("month", e.target.value);
    includeDay.onchange = (e) => Storage.update("includeDay", e.target.checked);
    ignoreForgetDK.onchange = (e) =>
      Storage.update("ignoreForgetDK", e.target.checked);
    autoOpen.onchange = (e) =>
      Storage.update("autoOpenTable", e.target.checked);

    selectedYear.onchange = (e) => Storage.update("year", e.target.value);
  };

  /** 加载事件 */
  document.addEventListener("DOMContentLoaded", initConfig);
  document.addEventListener("beforeunload", () => {
    Storage.remove(["includeDay", "ignoreForgetDK", "autoOpenTable"]);
  });
}

load();
