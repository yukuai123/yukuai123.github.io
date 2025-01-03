import dayjs from "dayjs";
import { default as duration } from "dayjs/plugin/duration";
import { default as weekOfYear } from "dayjs/plugin/weekOfYear";
import { default as updateLocale } from "dayjs/plugin/updateLocale";
import { default as localeData } from "dayjs/plugin/localeData";
import { AUTH_LINK } from "../utils/consts";

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

const getCurrentWorkerTime = (date) => {
  let DAY_WORKER_TIME = 9;
  let DAY_WORKER_MINUTE = DAY_WORKER_TIME * 60;

  let SB_BEGIN_TIME = "09:00:00";
  let SB_END_TIME = "18:00:00";

  /** 8.26实行7.5小时工作制 */
  if (
    dayjs(date).endOf("d").valueOf() >
    dayjs("2024-08-26").startOf("d").valueOf()
  ) {
    DAY_WORKER_TIME = 8.5;
    DAY_WORKER_MINUTE = DAY_WORKER_TIME * 60;
    SB_END_TIME = "17:30:00";
  }

  return {
    /** 默认一天工作小时数 */
    DAY_WORKER_TIME,
    /** 默认一天工作分钟数量 */
    DAY_WORKER_MINUTE,
    /** 默认下班时间 */
    SB_END_TIME,
    /** 默认上班时间 */
    SB_BEGIN_TIME,
  };
};

export async function onHandleData() {
  try {
    const { month, includeDay, ignoreForgetDK, year } = await Storage.get();

    const { userId, staffId } = await queryUserInfo();

    const { result } = await querySbDays({
      staff_id: staffId,
      userId,
      begin: dayjs()
        .set("year", year)
        .set("month", month - 1)
        .startOf("month")
        .format("YYYY-MM-DD"),
      end: dayjs()
        .set("year", year)
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
        const target = item.jsonList[0];

        const {
          DAY_WORKER_TIME,
          DAY_WORKER_MINUTE,
          SB_END_TIME,
          SB_BEGIN_TIME,
        } = getCurrentWorkerTime(target.work_day);

        target.DAY_WORKER_TIME = DAY_WORKER_TIME;
        target.DAY_WORKER_MINUTE = DAY_WORKER_MINUTE;

        /** 工作日 */
        if (target.datetypename === "工作日") {
          target.originSbBeginDate = target.sb_dk_time;
          target.originXbBeginDate = target.xb_dk_time;

          if ((!target.sb_dk_time || !target.xb_dk_time) && ignoreForgetDK) {
            target.sb_dk_time =
              target.sb_dk_time || `${target.work_day} ${SB_BEGIN_TIME}`;
            target.xb_dk_time =
              target.xb_dk_time || `${target.work_day} ${SB_END_TIME}`;
            target.ignoreForgetDK = true;
            target.missDKType = !target.sb_dk_time ? 1 : 2; // 漏打卡类型 1 上班 2 下班
          }
        }
        if (target.bc_name === "休息") {
          target.isFreeDay = true;
        }

        if (target.abnormal_name === "请假") {
          const beginDate = dayjs(target.begin_date_time);
          const endDate = dayjs(target.end_date_time);

          const sbBeginDate = dayjs(target.originSbBeginDate);
          const xbBeginDate = dayjs(target.originXbBeginDate);

          target.FORCE_FREE_BEGIN_TIME = dayjs(target.begin_date_time).format(
            "HH:mm"
          );
          target.FORCE_FREE_END_TIME = dayjs(target.end_date_time).format(
            "HH:mm"
          );
          target.FORCE_FREE_TOTAL_TIME = target.abnormal_minute / 60;
          target.FORCE_FREE_TOTAL_MINS = target.abnormal_minute;

          /** 如果请假时间比上班时间晚 并且没打上班卡，那么使用请假时间作为上班时间 */
          if (
            !target.originSbBeginDate ||
            (target.originSbBeginDate && sbBeginDate.isAfter(beginDate))
          ) {
            target.sb_dk_time = target.begin_date_time;
          }
          /** 如果请假时间比下班时间晚 或者 没打下班卡，那么使用请假时间作为下班时间 */
          if (
            !target.originXbBeginDate ||
            (target.originXbBeginDate && endDate.isAfter(xbBeginDate))
          ) {
            target.xb_dk_time = target.end_date_time;
          }
        }

        return target;
      });

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
  } catch (e) {
    console.log(e, "error");
  }
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
      onHandleData().then((res) => {
        downloadExcel(res.exportExcelData, res.month);
        sendResponse();
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
}
