import dayjs from "dayjs";
import Storage from "../utils/storage";
import { genYearList } from "../utils/tools";
import {
  chromeRuntimeSendMessage,
  isExistValidTab,
  openOrReuseAuthTab,
} from "../utils/native";
import { getThemeSettings, applyThemeToDocument } from "../utils/theme";

const THEME_ICON_MAP = {
  light: {
    src: "./月亮.svg",
    label: "切换到夜间模式",
  },
  dark: {
    src: "./太阳.svg",
    label: "切换到浅色模式",
  },
};

function genYearOptions(selectYear) {
  const yearList = genYearList();

  yearList.forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.text = year;
    selectYear.appendChild(option);
  });
}

function setLoading(loading) {
  const loadingDom = document.getElementById("loading");
  loadingDom.style.display = loading ? "flex" : "none";
}

function getMaxAvailableMonth(selectedYear) {
  const now = new Date();
  const currentYear = now.getFullYear();

  if (Number(selectedYear) < currentYear) {
    return 12;
  }

  if (Number(selectedYear) > currentYear) {
    return 0;
  }

  return now.getMonth() + 1;
}

function syncMonthSelectOptions(selectMonth, selectedYear) {
  const maxAvailableMonth = getMaxAvailableMonth(selectedYear);
  const monthOptions = [...selectMonth.options];

  monthOptions.forEach((option) => {
    const optionMonth = Number(option.value);
    option.disabled = optionMonth > maxAvailableMonth;
  });

  const currentMonth = Number(selectMonth.value);
  if (!currentMonth || currentMonth > maxAvailableMonth) {
    selectMonth.value = maxAvailableMonth > 0 ? String(maxAvailableMonth) : "1";
  }

  return Number(selectMonth.value);
}

function formatUpdateTime(updateTime) {
  if (!updateTime) {
    return "暂无";
  }

  return dayjs(updateTime).format("YYYY-MM-DD HH:mm:ss");
}

function renderSummary({ renderHourText, renderMinText, updateTime } = {}) {
  const calcContent = document.getElementById("calcContent");
  const hourText = renderHourText || "还没有计算结果";
  const minText = renderMinText || "点击统计时长按钮开始统计";
  const lastUpdate = formatUpdateTime(updateTime);
  const isShortage =
    hourText.includes("工时不足") || minText.includes("工时不足");
  const statusClass = isShortage ? "is-danger" : "is-safe";

  calcContent.innerHTML = `
    <div class="summary">
      <strong>工时概览</strong>
      <div class="summary-line">小时：<strong class="${statusClass}">${hourText}</strong></div>
      <div class="summary-line">分钟：<strong class="${statusClass}">${minText}</strong></div>
      <div class="summary-meta">上次更新：${lastUpdate}</div>
    </div>
  `;
}

async function initThemeControls() {
  const themeModeToggle = document.getElementById("themeModeToggle");
  const themeModeIcon = document.getElementById("themeModeIcon");
  const themeSettings = await getThemeSettings(chrome.storage.local);

  function syncThemeButton(themeMode) {
    const iconConfig = THEME_ICON_MAP[themeMode];
    themeModeIcon.src = iconConfig.src;
    themeModeToggle.setAttribute("aria-label", iconConfig.label);
    themeModeToggle.setAttribute("title", iconConfig.label);
  }

  applyThemeToDocument(document, themeSettings);
  syncThemeButton(themeSettings.themeMode);

  themeModeToggle.onclick = async () => {
    const themeMode =
      document.body.dataset.themeMode === "dark" ? "light" : "dark";
    applyThemeToDocument(document, { themeMode });
    syncThemeButton(themeMode);
    await Storage.update("themeMode", themeMode);
  };
}

async function ensureAuthorized() {
  const isExist = await isExistValidTab();

  if (!isExist) {
    await openOrReuseAuthTab();
    return false;
  }

  return true;
}

function bindAction(button, type, callback) {
  button.onclick = async () => {
    const canProceed = await ensureAuthorized();

    if (!canProceed) {
      return;
    }

    setLoading(true);
    chromeRuntimeSendMessage({ type }, async (data) => {
      setLoading(false);
      const payload = data?.payload || {};

      if (payload.type === "tokenExpired" || data?.error) {
        return;
      }

      if (callback && payload.type === type) {
        await callback(payload);
      }
    });
  };
}

async function initConfig() {
  const selectMonth = document.getElementById("selectedMonth");
  const includeDay = document.getElementById("includesDay");
  const ignoreForgetDK = document.getElementById("ignoreForgetDK");
  const autoOpen = document.getElementById("autoOpenTable");
  const selectYear = document.getElementById("selectedYear");

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

  if (storeMonth !== undefined) {
    defaultMonth = storeMonth;
  }
  if (storeYear !== undefined) {
    defaultYear = storeYear;
  }
  if (storeIncludeDay !== undefined) {
    defaultIncludeDay = storeIncludeDay;
  }
  if (storeIgnoreForgetDK !== undefined) {
    defaultIgnoreForgetDK = storeIgnoreForgetDK;
  }
  if (storeAutoOpenTable !== undefined) {
    defaultAutoOpenTable = storeAutoOpenTable;
  }

  selectMonth.value = defaultMonth;
  selectYear.value = defaultYear;
  includeDay.checked = defaultIncludeDay;
  ignoreForgetDK.checked = defaultIgnoreForgetDK;
  autoOpen.checked = defaultAutoOpenTable;

  defaultMonth = syncMonthSelectOptions(selectMonth, defaultYear);

  await Storage.updateBatch({
    month: defaultMonth,
    year: defaultYear,
    includeDay: defaultIncludeDay,
    ignoreForgetDK: defaultIgnoreForgetDK,
    autoOpenTable: defaultAutoOpenTable,
  });

  selectMonth.onchange = (e) => Storage.update("month", Number(e.target.value));
  selectYear.onchange = async (e) => {
    const selectedYear = Number(e.target.value);
    const selectedMonth = syncMonthSelectOptions(selectMonth, selectedYear);

    await Storage.updateBatch({
      year: selectedYear,
      month: selectedMonth,
    });
  };
  includeDay.onchange = (e) => Storage.update("includeDay", e.target.checked);
  ignoreForgetDK.onchange = (e) =>
    Storage.update("ignoreForgetDK", e.target.checked);
  autoOpen.onchange = (e) => Storage.update("autoOpenTable", e.target.checked);
}

async function init() {
  const selectYear = document.getElementById("selectedYear");
  const link = document.getElementById("link");
  const calcBtn = document.getElementById("calc");
  const calcOnlineBtn = document.getElementById("calcOnline");
  const exportExcelBtn = document.getElementById("submit");

  genYearOptions(selectYear);
  await initThemeControls();
  await initConfig();

  const { renderHourText, renderMinText, updateTime } = await Storage.get();
  renderSummary({ renderHourText, renderMinText, updateTime });

  link.onclick = () => openOrReuseAuthTab();

  bindAction(calcBtn, "calc", async (payload) => {
    const nextSummary = {
      renderHourText: payload.renderHourText,
      renderMinText: payload.renderMinText,
      updateTime: Date.now(),
    };

    renderSummary(nextSummary);
    await Storage.updateBatch(nextSummary);
  });

  bindAction(calcOnlineBtn, "calcOnline");
  bindAction(exportExcelBtn, "exportExcel");
}

document.addEventListener("DOMContentLoaded", init);
