import dayjs from "dayjs";
import { getWorkdayConfig } from "./workday";

function shouldIncludeWorkDay(workDay, includeDay) {
  return includeDay ? true : workDay !== dayjs().format("YYYY-MM-DD");
}

export function getMonthRange(year, month) {
  return {
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
  };
}

export function filterWorkerDays(workerDays = [], { includeDay }) {
  return workerDays
    .filter(
      (item) =>
        dayjs(item.work_day).startOf("d").valueOf() <
        dayjs().add(1, "d").startOf("d").valueOf(),
    )
    .filter((item) => shouldIncludeWorkDay(item.work_day, includeDay));
}

export function normalizeAttendanceDetail(item, { ignoreForgetDK }) {
  const target = Array.isArray(item.jsonList) && item.jsonList[0];

  if (!target) {
    return null;
  }

  if (target.bc_name === "休息" && !target.sb_dk_time && !target.xb_dk_time) {
    return null;
  }

  const { DAY_WORKER_TIME, DAY_WORKER_MINUTE, SB_END_TIME, SB_BEGIN_TIME } =
    getWorkdayConfig(target.work_day);

  target.DAY_WORKER_TIME = DAY_WORKER_TIME;
  target.DAY_WORKER_MINUTE = DAY_WORKER_MINUTE;

  if (target.datetypename === "工作日" && target.abnormal_name !== "外出") {
    target.originSbBeginDate = target.sb_dk_time;
    target.originXbBeginDate = target.xb_dk_time;

    if ((!target.sb_dk_time || !target.xb_dk_time) && ignoreForgetDK) {
      const missingStartTime = !target.sb_dk_time;
      target.sb_dk_time =
        target.sb_dk_time || `${target.work_day} ${SB_BEGIN_TIME}`;
      target.xb_dk_time =
        target.xb_dk_time || `${target.work_day} ${SB_END_TIME}`;
      target.ignoreForgetDK = true;
      target.missDKType = missingStartTime ? 1 : 2;
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
      "HH:mm",
    );
    target.FORCE_FREE_END_TIME = dayjs(target.end_date_time).format("HH:mm");
    target.FORCE_FREE_TOTAL_TIME = target.abnormal_minute / 60;
    target.FORCE_FREE_TOTAL_MINS = target.abnormal_minute;

    if (
      !target.originSbBeginDate ||
      (target.originSbBeginDate && sbBeginDate.isAfter(beginDate))
    ) {
      target.sb_dk_time = target.begin_date_time;
    }

    if (
      !target.originXbBeginDate ||
      (target.originXbBeginDate && endDate.isAfter(xbBeginDate))
    ) {
      target.xb_dk_time = target.end_date_time;
    }
  }

  if (target.abnormal_name === "外出") {
    const wcList = item.jsonList?.length > 1 ? item.jsonList : null;

    target.sb_dk_time =
      target.begin_date_time || `${target.work_day} ${SB_BEGIN_TIME}`;
    target.xb_dk_time = wcList
      ? wcList[wcList.length - 1].end_date_time ||
        target.end_date_time ||
        `${target.work_day} ${SB_END_TIME}`
      : target.end_date_time || `${target.work_day} ${SB_END_TIME}`;
  }

  return target;
}
