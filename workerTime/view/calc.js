import {
  getCurrentWorkdayText,
  getWorkdayConfig,
  getWorkdayRuleList,
} from "../utils/workday.js";
import { getThemeSettings, applyThemeToDocument } from "../utils/theme.js";

const THEME_ICON_MAP = {
  light: {
    src: "../月亮.svg",
    label: "切换到夜间模式",
  },
  dark: {
    src: "../太阳.svg",
    label: "切换到浅色模式",
  },
};

function getTipClass(time) {
  if (Number(time) !== Number(time)) {
    return "";
  }

  return time > 0 ? "tip-positive" : "tip-negative";
}

function getSummaryTone(renderConvertTimeText = "") {
  return renderConvertTimeText.includes("工时不足") ? "is-danger" : "is-safe";
}

function renderStateTag(item) {
  const tags = [];

  if (item.isFreeDay) {
    tags.push(`<span class="tag tag-overtime">休息日上班</span>`);
  }

  if (item.ignoreForgetDK) {
    tags.push(`<span class="tag tag-auto">缺卡已补齐</span>`);
  }

  if (item.hour === "忘记打卡" && !item.ignoreForgetDK && !item.isFreeDay) {
    tags.push(`<span class="tag tag-miss">缺卡待确认</span>`);
  }

  if (item.forceFreeTotalTime) {
    tags.push(`<span class="tag tag-leave">含请假</span>`);
  }

  return tags.join("");
}

function renderDaySummary(item) {
  const diffText =
    item.convertDiffTime || (item.hour === "忘记打卡" ? "待确认" : "0分钟");

  return `
    <td class="date-cell">
      <div class="date-main">${item.workDay}</div>
      <div class="tag-row">${renderStateTag(item)}</div>
    </td>
    <td>
      <div class="mono-text">${item.startTime}</div>
      ${
        item.ignoreForgetDK && item.missDKType === 1
          ? '<div class="cell-note">(忘记打卡)</div>'
          : ""
      }
      ${
        item.forceFreeBeginTime
          ? `<div class="cell-note">${item.forceFreeBeginTime}(请假)</div>`
          : ""
      }
    </td>
    <td>
      <div class="mono-text">${item.endTime}</div>
      ${
        item.ignoreForgetDK && item.missDKType === 2
          ? '<div class="cell-note">(忘记打卡)</div>'
          : ""
      }
      ${
        item.forceFreeEndTime
          ? `<div class="cell-note">${item.forceFreeEndTime}(请假)</div>`
          : ""
      }
    </td>
    <td>
      <div class="value-strong">${item.convertTime || "0分钟"}</div>
    </td>
    <td>
      <div class="mono-text">${item.hour}(h)</div>
      <div class="mono-text">${item.minutes}(mins)</div>
    </td>
    <td class="${getTipClass(item.diffHour)}">
      <div class="value-strong">${diffText}</div>
    </td>
    <td>
      <div class="value-strong">${item.convertForceFreeTotalTime || "-"}</div>
    </td>
  `;
}

function renderWeekCell(item) {
  if (!item.rowspan) {
    return "";
  }

  const weekStatusText =
    item.diffWeekHour > 0
      ? `可调休：${item.convertDiffWeekTime}`
      : `工时不足：${item.convertDiffWeekTime}`;

  return `
    <td rowspan="${item.rowspan}" class="week-cell">
      <div class="week-card">
        <div class="week-index">本月第${item.convertWeekNumber}周</div>
        <div class="week-time">周工时：${item.convertWeekTime}</div>
        <div class="week-diff ${getTipClass(item.diffWeekHour)}">${weekStatusText}</div>
      </div>
    </td>
  `;
}

function renderEmptyState() {
  return `
    <section class="panel empty-state">
      <div class="empty-title">暂无报表数据</div>
      <div class="empty-text">先回到插件弹窗点击“统计时长”或“在线查看报表”。</div>
    </section>
  `;
}

function isPendingMissPunch(item) {
  return item.hour === "忘记打卡" && !item.ignoreForgetDK && !item.isFreeDay;
}

function renderRuleTipsInline() {
  return getWorkdayRuleList()
    .map((rule) => {
      if (!rule.start && rule.end) {
        return `${rule.end}及以前 ${rule.dayWorkTimeText} (${rule.beginTime} - ${rule.endTime})`;
      }

      if (rule.start && rule.end) {
        return `${rule.start} 至 ${rule.end} ${rule.dayWorkTimeText} (${rule.beginTime} - ${rule.endTime})`;
      }

      return `${rule.start}起 ${rule.dayWorkTimeText} (${rule.beginTime} - ${rule.endTime})`;
    })
    .join("；");
}

function renderMissPunchNotes(rowData = []) {
  const pendingRows = rowData.filter((item) => isPendingMissPunch(item));
  const pendingText = pendingRows.length
    ? `<strong>缺卡待确认 ${pendingRows.length} 天，表格内已高亮</strong>；`
    : "";
  const ruleTips = renderRuleTipsInline();

  return `
    <div class="foot-tip">
      <span class="foot-tip-label">tips</span>
      <span class="foot-tip-text">${pendingText}工时规则：${ruleTips}</span>
    </div>
  `;
}

function renderExcelData(
  rowData = [],
  {
    convertForceFreeTotalMins,
    renderConvertTimeText,
    convertDiffTime,
    updateTime,
  },
) {
  const tableContentDom = document.querySelector("#table-content");

  if (!rowData.length) {
    tableContentDom.innerHTML = renderEmptyState();
    return;
  }

  const toneClass = getSummaryTone(renderConvertTimeText);
  const todayWorkTime = getCurrentWorkdayText();
  const updatedAt = updateTime
    ? new Date(updateTime).toLocaleString("zh-CN", { hour12: false })
    : "暂无";
  const missPunchNotes = renderMissPunchNotes(rowData);

  tableContentDom.innerHTML = `
    <section class="summary-strip">
      <article class="metric-card ${toneClass}">
        <span class="metric-label">工时概览</span>
        <strong class="metric-value">${renderConvertTimeText || "暂无数据"}</strong>
      </article>
      <article class="metric-card">
        <span class="metric-label">当前日工时</span>
        <strong class="metric-value">${todayWorkTime}</strong>
      </article>
      <article class="metric-card">
        <span class="metric-label">月休假时长</span>
        <strong class="metric-value">${convertForceFreeTotalMins || "0分钟"}</strong>
      </article>
      <article class="metric-card">
        <span class="metric-label">下班倒计时</span>
        <div>
          <strong class="metric-value ${toneClass}" id="time">计算中...</strong>
          <span class="metric-foot">更新：${updatedAt}</span>
        </div>
      </article>
    </section>
    <section class="table-shell">
      <div class="table-scroll">
        <table class="report-table">
          <thead>
            <tr>
              <th scope="col">日期</th>
              <th scope="col">上班打卡</th>
              <th scope="col">下班打卡</th>
              <th scope="col">工作时长</th>
              <th scope="col">原始数据</th>
              <th scope="col">差异值</th>
              <th scope="col">请假时长</th>
              <th scope="col">周工作时长</th>
            </tr>
          </thead>
          <tbody>
            ${rowData
              .map((item) => {
                return `
                  <tr class="${isPendingMissPunch(item) ? "pending-miss-row" : ""}">
                    ${renderDaySummary(item)}
                    ${renderWeekCell(item)}
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
    ${missPunchNotes}
  `;
}

function startCountdown() {
  let intervalId = null;

  function syncCountdown() {
    const timeDom = document.querySelector("#time");

    if (!timeDom) {
      return;
    }

    const { SB_END_TIME } = getWorkdayConfig();
    const targetTime = new Date(
      `${new Date().toDateString()} ${SB_END_TIME}`,
    ).getTime();
    const currentTime = Date.now();
    const diff = targetTime - currentTime;

    if (diff <= 0) {
      timeDom.textContent = "别卷了，回去休息";
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    timeDom.textContent = `${hours}小时 ${minutes}分钟 ${seconds}秒`;
  }

  function resetCountdown() {
    if (intervalId) {
      clearInterval(intervalId);
    }

    syncCountdown();
    intervalId = setInterval(syncCountdown, 1000);
  }

  resetCountdown();
  document.addEventListener("visibilitychange", resetCountdown);
}

async function initThemeToggle() {
  const toggleDom = document.querySelector("#themeModeToggle");
  const iconDom = document.querySelector("#themeModeIcon");
  if (!toggleDom) {
    return;
  }

  const { themeMode } = await getThemeSettings(chrome.storage.local);

  function syncThemeButton(nextThemeMode) {
    const iconConfig = THEME_ICON_MAP[nextThemeMode];
    iconDom.src = iconConfig.src;
    toggleDom.setAttribute("aria-label", iconConfig.label);
    toggleDom.setAttribute("title", iconConfig.label);
  }

  syncThemeButton(themeMode);

  toggleDom.onclick = async () => {
    const nextThemeMode =
      document.body.dataset.themeMode === "dark" ? "light" : "dark";

    applyThemeToDocument(document, { themeMode: nextThemeMode });
    syncThemeButton(nextThemeMode);
    await chrome.storage.local.set({ themeMode: nextThemeMode });
  };
}

(async () => {
  const themeSettings = await getThemeSettings(chrome.storage.local);
  applyThemeToDocument(document, themeSettings);

  const { excelData, ...restParams } = await chrome.storage.local.get();
  renderExcelData(excelData, restParams);
  startCountdown();
  initThemeToggle();
})();
