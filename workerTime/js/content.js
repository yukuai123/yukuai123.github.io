import dayjs from "dayjs";
import { default as duration } from "dayjs/plugin/duration";
import { default as weekOfYear } from "dayjs/plugin/weekOfYear";
import { default as updateLocale } from "dayjs/plugin/updateLocale";
import { default as localeData } from "dayjs/plugin/localeData";

import "../lib/zpix.ttf";
import Storage from "../utils/storage";
import { downloadExcel, formatExportExcelData } from "../utils/tools";
import { queryUserInfo, querySbDays, querySbDayDetail } from "../services";

/**
 * 月统计会把没打卡的时间作为负数减去
 * 周统计只统计对应上班时长
 */

dayjs.extend(duration);
dayjs.extend(weekOfYear);
dayjs.extend(updateLocale);
dayjs.extend(localeData);
dayjs.locale("zh-cn");
dayjs.updateLocale("zh-cn", {
  weekStart: 1, // 配置为周一
});

/** 默认一天工作小时数 */
let DAY_WORKER_TIME = 9;
/** 默认一天工作分钟数量 */
let DAY_WORKER_MINUTE = 60 * 9;

let cacheParams = {};
const useCacheTime = (time, currentParams) => {
  /** 一分钟以内的请求，请求参数相同 视为相同请求, 直接从缓存中取数 */
  const oneMins = 60 * 1000;
  const now = dayjs().valueOf();

  if (
    !time ||
    !Object.keys(cacheParams).length ||
    !Object.keys(currentParams).length
  ) {
    return false;
  }

  if (
    now - time < oneMins &&
    JSON.stringify(currentParams) === JSON.stringify(cacheParams)
  ) {
    return true;
  }

  return false;
};

async function onHandleData() {
  try {
    const { month, includeDay, updateTime, ...rest } = await Storage.get();

    const currentParams = { month, includeDay };
    const allowCache = useCacheTime(updateTime, currentParams);

    if (allowCache) {
      cacheParams = currentParams;
      return rest;
    } else {
      cacheParams = currentParams;
    }

    const { userId, staffId } = await queryUserInfo();

    const { result } = await querySbDays({
      staff_id: staffId,
      userId,
      begin: dayjs()
        .set("month", month - 1)
        .startOf("month")
        .format("YYYY-MM-DD"),
      end: dayjs()
        .set("month", month - 1)
        .endOf("month")
        .format("YYYY-MM-DD"),
    });

    /** 查询到今天的所有日期 (包含周末) */
    const workerDays = result["#result-set-1"].filter(
      (i) =>
        dayjs(i.work_day).startOf("d").valueOf() <
        dayjs().add(1, "d").startOf("d").valueOf()
    );

    let allWorkerDayDetail = await Promise.all(
      workerDays
        .filter((item) =>
          includeDay ? true : item.work_day !== dayjs().format("YYYY-MM-DD")
        )
        .map((item) => querySbDayDetail({ staffId, workDay: item.work_day }))
    );

    console.log(JSON.parse(JSON.stringify(allWorkerDayDetail)));

    allWorkerDayDetail = allWorkerDayDetail
      .filter((item) => {
        const target = Array.isArray(item.jsonList) && item.jsonList[0];
        if (!target) return false;

        if (target.bc_name === "休息") {
          /** 周末来上班 只打了上班或者下班卡 */
          if (!target.sb_dk_time && !target.xb_dk_time) {
            return false;
          }
        }
        return true;
      })
      .map((item) => {
        return item.jsonList[0];
      });

    const {
      renderMinText,
      renderHourText,
      formatWeekData,
      formatTimeData: exportExcelData,
    } = formatExportExcelData(allWorkerDayDetail, {
      DAY_WORKER_TIME,
      DAY_WORKER_MINUTE,
    });

    /** 更新存储中的数据 */
    await Storage.updateBatch({
      excelData: formatWeekData,
      renderMinText: renderMinText,
      renderHourText: renderHourText,
      exportExcelData: exportExcelData,
      updateTime: dayjs().valueOf(),
    });

    return {
      renderMinText,
      renderHourText,
      exportExcelData,
      formatWeekData,
    };
  } catch (e) {
    console.log(e, "error");
  }
}

// content.js
chrome.runtime.onMessage.addListener(function (args, sender, sendResponse) {
  if (args.type == "run") {
    onHandleData().then((res) => {
      downloadExcel(res.exportExcelData);
    });
  }
  if (args.type == "calc") {
    onHandleData().then((res) => {
      sendResponse({
        payload: {
          type: "calc",
          renderHourText: res.renderHourText,
          renderMinText: res.renderMinText,
        },
      });
    });
  }
  if (args.type == "calcOnline") {
    onHandleData().then(() => {
      sendResponse({
        payload: {
          type: "calcOnline",
        },
      });
    });
  }

  return true;
});
