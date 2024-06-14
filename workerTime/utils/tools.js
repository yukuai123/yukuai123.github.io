import XLSX from "xlsx";
import dayjs from "dayjs";

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

export function calcWorkerTimeByDay(
  begin,
  end,
  workDay,
  { DAY_WORKER_TIME, DAY_WORKER_MINUTE }
) {
  const dayFormat = ["日", "一", "二", "三", "四", "五", "六"];
  const startTimeInfo = formatTime(begin);
  const endTimeInfo = formatTime(end);

  if (!startTimeInfo || !endTimeInfo) {
    return {
      hour: "忘记打卡",
      minutes: "忘记打卡",
      diffMins: "忘记打卡",
      diffHour: "忘记打卡",
      startTime: startTimeInfo
        ? dayjs(startTimeInfo).format("HH:mm")
        : "忘记打卡",
      endTime: endTimeInfo ? dayjs(endTimeInfo).format("HH:mm") : "忘记打卡",
      workDay: `${workDay} (星期${dayFormat[dayjs(workDay).day()]})`,
      totalDiffMins: 0,
      totalDiffHours: 0,
    };
  }

  const startTime = dayjs(startTimeInfo);
  const endTime = dayjs(endTimeInfo);

  const duration = dayjs.duration(endTime.diff(startTime));
  const minutes = duration.as("minutes");
  const hour = duration.as("hours");

  return {
    workDay: `${workDay} (星期${dayFormat[dayjs(workDay).day()]})`,
    hour: toFixed(hour),
    minutes: toFixed(minutes),
    diffHour: toFixed(hour - DAY_WORKER_TIME),
    diffMins: toFixed(minutes - DAY_WORKER_MINUTE),
    startTime: startTime.format("HH:mm"),
    endTime: endTime.format("HH:mm"),
    totalDiffMins: 0,
    totalDiffHours: 0,
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
  return list.map((data) =>
    Object.keys(data).reduce((ret, item) => {
      ret[TABLE_HEADER_MAP[item]] = data[item];
      return ret;
    }, {})
  );
}

export function formatExportExcelData(
  allWorkerDayDetail,
  { DAY_WORKER_MINUTE, DAY_WORKER_TIME }
) {
  const formatTimeData = allWorkerDayDetail
    .filter((item) => Array.isArray(item.jsonList) && item.jsonList[0])
    .map((item) => {
      const worInfo = (Array.isArray(item.jsonList) && item.jsonList[0]) || {};
      return calcWorkerTimeByDay(
        worInfo.sb_dk_time || 0,
        worInfo.xb_dk_time || 0,
        worInfo.work_day,
        { DAY_WORKER_TIME, DAY_WORKER_MINUTE }
      );
    });
  const { totalDiffMins, totalDiffHours } = formatTimeData.reduce(
    (ret, next) => {
      const isNotCalc = next.hour === "忘记打卡";
      ret.totalDiffMins += isNotCalc
        ? -DAY_WORKER_MINUTE
        : Number(next.diffMins);
      ret.totalDiffHours += isNotCalc
        ? -DAY_WORKER_TIME
        : Number(next.diffHour);
      return ret;
    },
    { totalDiffMins: 0, totalDiffHours: 0 }
  );

  let renderHourText = "暂无数据";
  let renderMinText = "暂无数据";
  if (formatTimeData.length) {
    if (totalDiffHours > 0) {
      renderMinText = `可以调休${toFixed(totalDiffMins)}分钟`;
      renderHourText = `可以调休${toFixed(totalDiffHours)}小时`;
    } else if (totalDiffHours < 0) {
      renderMinText = `工时不足${Number(toFixed(totalDiffMins))}分钟`;
      renderHourText = `工时不足${Number(toFixed(totalDiffHours))}小时`;
    } else {
      renderMinText = `时间管理大师！ 正常上下班即可。`;
      renderHourText = `时间管理大师！ 正常上下班即可。`;
    }
    formatTimeData[0].totalDiffMins = renderMinText;
    formatTimeData[0].totalDiffHours = renderHourText;
  }

  return { formatTimeData, renderMinText, renderHourText };
}

export function downloadExcel(rowData) {
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
  XLSX.writeFile(workbook, "本月工时.xlsx", { compression: true });
}
