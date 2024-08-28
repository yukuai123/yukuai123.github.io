import XLSX from "xlsx";
import dayjs from "dayjs";
import { EMPTY_TEXT } from "./consts";

export function toFixed(num) {
  return Number(num).toFixed(2);
}
export function formatQueryParams(params) {
  if (!params || !Object.keys(params).length) return "";
  return `?${Object.entries(params || {})
    .map(([k, v]) => `${k}=${v}`)
    .join("&")}`;
}

export function formatTime(time) {
  return time ? time : 0;
}

function formatDurationToHoursAndMinutes(duration) {
  if (!duration || typeof duration !== "number") {
    return 0;
  }

  const msTime = Math.abs(duration);
  const hours = Math.floor(msTime / 3600000); // 计算总小时数
  const minutes = Math.floor((msTime % 3600000) / 60000); // 计算剩余的分钟数

  if (!hours) {
    return `${minutes}分钟`;
  }
  if (!minutes) {
    return `${hours}小时`;
  }
  return `${hours}小时${minutes}分钟`;
}

export function calcWorkerTimeByDay(
  begin,
  end,
  workDay,
  {
    IS_FREE_DAY,
    DAY_WORKER_TIME,
    DAY_WORKER_MINUTE,
    IGNORE_FORGET_DK,
    FORCE_FREE_END_TIME,
    FORCE_FREE_BEGIN_TIME,
    FORCE_FREE_TOTAL_TIME,
    FORCE_FREE_TOTAL_MINS,
  }
) {
  const dayFormat = ["日", "一", "二", "三", "四", "五", "六"];
  const startTimeInfo = formatTime(begin);
  const endTimeInfo = formatTime(end);

  /** 星期日 视为上个周 所以将周数-1 */
  const weekNumber =
    dayjs(workDay).day() === 0
      ? dayjs(workDay).week() - 1
      : dayjs(workDay).week();

  if (!startTimeInfo || !endTimeInfo) {
    return {
      /** 是否将忘记打卡内容计入工时 */
      ignoreForgetDK: IGNORE_FORGET_DK,
      /** 是否休息日来上班 */
      isFreeDay: IS_FREE_DAY,
      originDay: workDay,
      weekNumber,
      hour: EMPTY_TEXT,
      minutes: EMPTY_TEXT,
      diffMins: EMPTY_TEXT,
      diffHour: EMPTY_TEXT,
      startTime: startTimeInfo
        ? dayjs(startTimeInfo).format("HH:mm")
        : EMPTY_TEXT,
      endTime: endTimeInfo ? dayjs(endTimeInfo).format("HH:mm") : EMPTY_TEXT,
      workDay: `${workDay} (星期${dayFormat[dayjs(workDay).day()]})`,
      totalDiffMins: 0,
      totalDiffHours: 0,
      dayWorkerTime: DAY_WORKER_TIME,
      dayWorkerMinute: DAY_WORKER_MINUTE,
    };
  }

  const startTime = dayjs(startTimeInfo);
  const endTime = dayjs(endTimeInfo);

  const duration = dayjs.duration(endTime.diff(startTime));
  const minutes = duration.as("minutes");
  const hour = duration.as("hours");

  const diffMins = minutes - (IS_FREE_DAY ? 0 : DAY_WORKER_MINUTE);
  const convertDiffTime = formatDurationToHoursAndMinutes(diffMins * 60 * 1000);
  return {
    /** 是否将忘记打卡内容计入工时 */
    ignoreForgetDK: IGNORE_FORGET_DK,
    /** 是否休息日来上班 */
    isFreeDay: IS_FREE_DAY,
    /** 日期 */
    originDay: workDay,
    /** 年-周数 */
    weekNumber,
    /** 带星期的日期 */
    workDay: `${workDay} (星期${dayFormat[dayjs(workDay).day()]})`,
    /** 日工时（小时） */
    hour: toFixed(hour),
    /** 日工时（分钟） */
    minutes: toFixed(minutes),
    /** 日差异工时（小时） */
    diffHour: toFixed(hour - (IS_FREE_DAY ? 0 : DAY_WORKER_TIME)),
    /** 日差异工时（分钟） */
    diffMins: toFixed(diffMins),
    /** 上班时间 */
    startTime: startTime.format("HH:mm"),
    /** 下班时间 */
    endTime: endTime.format("HH:mm"),
    /** 月差异工时（分钟） */
    totalDiffMins: 0,
    /** 月差异工时（小时） */
    totalDiffHours: 0,
    convertTime: formatDurationToHoursAndMinutes(duration.valueOf()),
    convertDiffTime: diffMins >= 0 ? convertDiffTime : `-${convertDiffTime}`,
    convertForceFreeTotalTime: formatDurationToHoursAndMinutes(
      FORCE_FREE_TOTAL_MINS * 60 * 1000
    ),
    dayWorkerTime: DAY_WORKER_TIME,
    dayWorkerMinute: DAY_WORKER_MINUTE,
    forceFreeBeginTime: FORCE_FREE_BEGIN_TIME,
    forceFreeEndTime: FORCE_FREE_END_TIME,
    forceFreeTotalTime: FORCE_FREE_TOTAL_TIME,
    forceFreeTotalMins: FORCE_FREE_TOTAL_MINS,
  };
}

export function formatExportExcelData(allWorkerDayDetail) {
  const originData = allWorkerDayDetail.map((item) => {
    return calcWorkerTimeByDay(
      item.sb_dk_time || 0,
      item.xb_dk_time || 0,
      item.work_day,
      {
        IS_FREE_DAY: item.isFreeDay,
        DAY_WORKER_TIME: item.DAY_WORKER_TIME,
        DAY_WORKER_MINUTE: item.DAY_WORKER_MINUTE,
        IGNORE_FORGET_DK: item.ignoreForgetDK,
        FORCE_FREE_BEGIN_TIME: item.FORCE_FREE_BEGIN_TIME,
        FORCE_FREE_END_TIME: item.FORCE_FREE_END_TIME,
        FORCE_FREE_TOTAL_TIME: item.FORCE_FREE_TOTAL_TIME,
        FORCE_FREE_TOTAL_MINS: item.FORCE_FREE_TOTAL_MINS,
      }
    );
  });

  /** 纯粹的报表数据 */
  const formatTimeData = originData;

  /** 周数据归并处理 */
  const weekData = originData.reduce((ret, next) => {
    /** 合并行 */
    /** rowspan */
    const info = ret[next.weekNumber];

    const currentDiffHour =
      next.diffHour !== EMPTY_TEXT ? Number(next.diffHour) : 0;
    const currentDiffMins =
      next.diffMins !== EMPTY_TEXT ? Number(next.diffMins) : 0;

    const currentHour = next.hour !== EMPTY_TEXT ? Number(next.hour) : 0;
    const currentMins = next.minutes !== EMPTY_TEXT ? Number(next.minutes) : 0;

    if (!info) {
      ret[next.weekNumber] = {
        rowspan: 1,
        originDay: next.originDay,
        weekHour: currentHour,
        weekMins: currentMins,
        diffWeekHour: currentDiffHour,
        diffWeekMins: currentDiffMins,
      };
    } else {
      ret[next.weekNumber].rowspan += 1;
      ret[next.weekNumber].weekHour += currentHour;
      ret[next.weekNumber].weekMins += currentMins;
      ret[next.weekNumber].diffWeekHour += currentDiffHour;
      ret[next.weekNumber].diffWeekMins += currentDiffMins;
    }
    ret[next.weekNumber].convertWeekTime = formatDurationToHoursAndMinutes(
      ret[next.weekNumber].weekMins * 60 * 1000
    );
    ret[next.weekNumber].convertDiffWeekTime = formatDurationToHoursAndMinutes(
      ret[next.weekNumber].diffWeekMins * 60 * 1000
    );

    return ret;
  }, {});

  /** 将周数转为从1开始的数字 */
  const weekNumberMap = Object.keys(weekData).reduce((ret, next, index) => {
    ret[next] = index + 1;
    return ret;
  }, {});

  /** 源数据添加周数据信息 */
  const formatWeekData = originData.map((item) => {
    if (item.originDay === weekData[item.weekNumber].originDay) {
      return {
        ...item,
        ...weekData[item.weekNumber],
        convertWeekNumber: weekNumberMap[item.weekNumber],
      };
    }
    return item;
  });

  const {
    totalDiffMins,
    totalDiffHours,
    forceFreeTotalTime,
    forceFreeTotalMins,
  } = originData.reduce(
    (ret, next) => {
      const forgetDK = next.hour === EMPTY_TEXT;
      let currentDiffHour = Number(next.diffHour) || 0;
      let currentDiffMins = Number(next.diffMins) || 0;
      if (forgetDK && !next.isFreeDay) {
        currentDiffHour = -next.dayWorkerTime;
        currentDiffMins = -next.dayWorkerMinute;
      }

      ret.totalDiffHours += currentDiffHour;
      ret.totalDiffMins += currentDiffMins;

      ret.forceFreeTotalTime += next.forceFreeTotalTime || 0;
      ret.forceFreeTotalMins += next.forceFreeTotalMins || 0;

      return ret;
    },
    {
      totalDiffMins: 0,
      totalDiffHours: 0,
      forceFreeTotalTime: 0,
      forceFreeTotalMins: 0,
    }
  );

  const totalDiffMs = totalDiffMins * 60 * 1000;
  const totalForceFreeTotalMs = forceFreeTotalMins * 60 * 1000;
  const convertDiffTime = formatDurationToHoursAndMinutes(totalDiffMs);
  const convertForceFreeTotalMins = formatDurationToHoursAndMinutes(
    totalForceFreeTotalMs
  );

  let renderHourText = "暂无数据";
  let renderMinText = "暂无数据";
  let renderConvertTimeText = "暂无数据";
  if (formatTimeData.length) {
    if (totalDiffHours > 0) {
      renderMinText = `可以调休${toFixed(totalDiffMins)}分钟`;
      renderHourText = `可以调休${toFixed(totalDiffHours)}小时`;
      renderConvertTimeText = `可以调休 ${convertDiffTime}`;
    } else if (totalDiffHours < 0) {
      renderMinText = `工时不足${Number(toFixed(totalDiffMins))}分钟`;
      renderHourText = `工时不足${Number(toFixed(totalDiffHours))}小时`;
      renderConvertTimeText = `工时不足 ${convertDiffTime}`;
    } else {
      renderMinText = `时间管理大师！ 正常上下班即可。`;
      renderHourText = `时间管理大师！ 正常上下班即可。`;
      renderConvertTimeText = `时间管理大师！ 正常上下班即可。`;
    }
    formatTimeData[0].totalDiffMins = renderMinText;
    formatTimeData[0].totalDiffHours = renderHourText;
  }

  return {
    renderConvertTimeText,
    convertDiffTime,
    formatTimeData,
    renderMinText,
    renderHourText,
    formatWeekData,
    forceFreeTotalTime,
    forceFreeTotalMins,
    convertForceFreeTotalMins,
  };
}

const TABLE_HEADER_MAP = {
  workDay: "工作日",
  hour: "工作时长（小时）",
  minutes: "工作时长（分钟）",
  diffHour: "差异值（小时）",
  diffMins: "差异值（分钟）",
  startTime: "上班打卡时间",
  endTime: "下班打卡时间",
  totalDiffMins: "总差异值（分钟）",
  totalDiffHours: "总差异值（小时）",
};

export function convertKeys(list) {
  return list.map((data) => {
    return Object.keys(data)
      .filter((item) => TABLE_HEADER_MAP[item])
      .reduce((ret, item) => {
        ret[TABLE_HEADER_MAP[item]] = data[item];
        return ret;
      }, {});
  });
}

export function downloadExcel(rowData, month) {
  const formatData = convertKeys(rowData);

  const worksheet = XLSX.utils.json_to_sheet(formatData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Dates");

  const HEADER_List = [...Object.values(TABLE_HEADER_MAP)];

  /* fix headers */
  XLSX.utils.sheet_add_aoa(worksheet, [HEADER_List], {
    origin: "A1",
  });

  /* calculate column width */
  worksheet["!cols"] = HEADER_List.map(() => ({ wch: 24 }));

  /* create an XLSX file and try to save to Presidents.xlsx */
  XLSX.writeFile(
    workbook,
    `${dayjs()
      .month(month - 1)
      .format("YYYY-MM")}工时.xlsx`,
    { compression: true }
  );
}
