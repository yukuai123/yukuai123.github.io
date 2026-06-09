const WORKDAY_RULES = [
  {
    start: null,
    end: "2024-08-25",
    dayWorkerTime: 9,
    dayWorkerMinute: 540,
    beginTime: "09:00:00",
    endTime: "18:00:00",
    dayWorkTimeText: "9小时",
  },
  {
    start: "2024-08-26",
    end: "2026-03-31",
    dayWorkerTime: 8.5,
    dayWorkerMinute: 510,
    beginTime: "09:00:00",
    endTime: "17:30:00",
    dayWorkTimeText: "8小时30分钟",
  },
  {
    start: "2026-04-01",
    end: null,
    dayWorkerTime: 9,
    dayWorkerMinute: 540,
    beginTime: "09:00:00",
    endTime: "18:00:00",
    dayWorkTimeText: "9小时",
  },
];

function normalizeDate(date = new Date()) {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  return targetDate;
}

function isInDateRange(targetDate, rule) {
  const current = normalizeDate(targetDate).getTime();
  const startTime = rule.start ? normalizeDate(rule.start).getTime() : -Infinity;
  const endTime = rule.end ? normalizeDate(rule.end).getTime() : Infinity;

  return current >= startTime && current <= endTime;
}

export function getWorkdayConfig(date = new Date()) {
  const currentRule =
    WORKDAY_RULES.find((rule) => isInDateRange(date, rule)) || WORKDAY_RULES[0];

  return {
    DAY_WORKER_TIME: currentRule.dayWorkerTime,
    DAY_WORKER_MINUTE: currentRule.dayWorkerMinute,
    SB_BEGIN_TIME: currentRule.beginTime,
    SB_END_TIME: currentRule.endTime,
    dayWorkTimeText: currentRule.dayWorkTimeText,
  };
}

export function getCurrentWorkdayText(date = new Date()) {
  return getWorkdayConfig(date).dayWorkTimeText;
}

export function getWorkdayRuleList() {
  return WORKDAY_RULES.map((rule) => ({
    start: rule.start,
    end: rule.end,
    dayWorkTimeText: rule.dayWorkTimeText,
    beginTime: rule.beginTime,
    endTime: rule.endTime,
  }));
}
