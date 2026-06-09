import dayjs from "dayjs";
import { default as duration } from "dayjs/plugin/duration";
import { default as weekOfYear } from "dayjs/plugin/weekOfYear";
import { default as updateLocale } from "dayjs/plugin/updateLocale";
import { default as localeData } from "dayjs/plugin/localeData";
import { AUTH_LINK } from "../utils/consts";

import Storage from "../utils/storage";
import {
  filterWorkerDays,
  getMonthRange,
  normalizeAttendanceDetail,
} from "../utils/attendance";
import { downloadExcel, formatExportExcelData } from "../utils/tools";
import { queryUserInfo, querySbDays, querySbDayDetail } from "../services";

dayjs.extend(duration);
dayjs.extend(weekOfYear);
dayjs.extend(updateLocale);
dayjs.extend(localeData);
dayjs.locale("zh-cn");
dayjs.updateLocale("zh-cn", {
  weekStart: 1, // 配置为周一
});

async function queryAttendanceDetails(workerDays, staffId) {
  return Promise.all(
    workerDays.map((item) => querySbDayDetail({ staffId, workDay: item.work_day })),
  );
}

export async function onHandleData() {
  const { month, includeDay, ignoreForgetDK, year } = await Storage.get();
  const { userId, staffId } = await queryUserInfo();
  const { begin, end } = getMonthRange(year, month);

  const { result } = await querySbDays({
    staff_id: staffId,
    userId,
    begin,
    end,
  });

  const workerDays = filterWorkerDays(result["#result-set-1"] || [], {
    includeDay,
  });

  const attendanceDetails = await queryAttendanceDetails(workerDays, staffId);
  const allWorkerDayDetail = attendanceDetails
    .map((item) => normalizeAttendanceDetail(item, { ignoreForgetDK }))
    .filter(Boolean);

  const {
    renderMinText,
    renderHourText,
    formatWeekData,
    formatTimeData: exportExcelData,
    forceFreeTotalMins,
    forceFreeTotalTime,
    ...restParams
  } = formatExportExcelData(allWorkerDayDetail);

  /** 更新存储中的数据 */
  await Storage.updateBatch({
    excelData: formatWeekData, // 格式化好的在线报表数据（包含周维度信息
    renderMinText, // 总分钟数
    renderHourText, // 总小时数
    exportExcelData, // 导出excel数据
    forceFreeTotalMins, // 强制休息总分钟数
    forceFreeTotalTime, // 强制休息总小时数
    updateTime: dayjs().valueOf(), // 更新时间
    ...restParams,
  });

  return {
    month,
    renderMinText,
    renderHourText,
    exportExcelData,
    formatWeekData,
    forceFreeTotalMins,
    forceFreeTotalTime,
    ...restParams,
  };
}

export function tokenExpired() {
  chrome.runtime.sendMessage({
    type: "tokenExpired",
  });
}

function handleTokenExpired(error, sendResponse) {
  tokenExpired();
  sendResponse({
    payload: {
      type: "tokenExpired",
    },
    error: error?.message || "tokenExpired",
  });
}

if (!window.INJECT_WORKER_TIME_FLAG) {
  /** 页面是否被动态注入了js */
  window.INJECT_WORKER_TIME_FLAG = true;

  // content.js
  chrome.runtime.onMessage.addListener(function (args, sender, sendResponse) {
    if (args.type == "openAuth") {
      window.open(AUTH_LINK);
    }
    if (args.type == "exportExcel") {
      onHandleData()
        .then((res) => {
          downloadExcel(res.exportExcelData, res.month);
          sendResponse({});
        })
        .catch((error) => handleTokenExpired(error, sendResponse));
    }
    if (args.type == "calc") {
      onHandleData()
        .then((res) => {
          sendResponse({
            payload: {
              type: "calc",
              renderHourText: res.renderHourText,
              renderMinText: res.renderMinText,
            },
          });
        })
        .catch((error) => handleTokenExpired(error, sendResponse));
    }
    if (args.type == "calcOnline") {
      onHandleData()
        .then(() => {
          sendResponse({
            payload: {
              type: "calcOnline",
            },
          });
        })
        .catch((error) => handleTokenExpired(error, sendResponse));
    }

    return true;
  });
}
