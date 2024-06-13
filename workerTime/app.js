import dayjs from "dayjs";
import { default as duration } from "dayjs/plugin/duration";
import request from "./utils/request";
import "./lib/zpix.ttf";
import {
  downloadExcel,
  formatQueryParams,
  formatExportExcelData,
} from "./utils/tools";

dayjs.extend(duration);

/** 默认一天工作小时数 */
let DAY_WORKER_TIME = 9;
/** 默认一天工作分钟数量 */
let DAY_WORKER_MINUTE = 60 * 9;

async function onHandleData(month, includeDay) {
  try {
    const { userId, staffId } = await request.post(
      `https://honghaioffice.tastien-external.com/RedseaPlatform/PtUsers.mc?method=getCurUserInfo`
    );
    const body = formatQueryParams({
      staff_id: staffId,
      userId,
      begin: dayjs().set("month", month).startOf("month").format("YYYY-MM-DD"),
      end: dayjs().set("month", month).endOf("month").format("YYYY-MM-DD"),
    }).slice(1);

    const { result } = await request.post(
      `https://honghaioffice.tastien-external.com/RedseaPlatform/getList/kq_count_abnormal_SelectStaffID/CoreRequest.mc`,
      body,
      {
        headers: {
          "content-type": `application/x-www-form-urlencoded`,
        },
      }
    );

    const workerDays = result["#result-set-1"].filter(
      (item) => item.sb_type == 0 && item.kq_status_total !== null
    );

    const allWorkerDayDetail = await Promise.all(
      workerDays
        .filter((item) =>
          includeDay ? true : item.work_day !== dayjs().format("YYYY-MM-DD")
        )
        .map((item) => {
          return request.post(
            `https://honghaioffice.tastien-external.com/RedseaPlatform/redmagicapi/rf_s_kq_count_SelectStaffIDDaily/getExecuteResult.mc`,
            formatQueryParams({
              staff_id: staffId,
              work_day: item.work_day,
            }).slice(1),
            {
              headers: {
                "content-type": `application/x-www-form-urlencoded`,
              },
            }
          );
        })
    );

    const {
      formatTimeData: exportExcelData,
      renderMinText,
      renderHourText,
    } = formatExportExcelData(allWorkerDayDetail, {
      DAY_WORKER_TIME,
      DAY_WORKER_MINUTE,
    });

    return {
      renderMinText,
      renderHourText,
      exportExcelData,
    };
  } catch (e) {
    console.log(e, "error");
  }
}

// content.js
chrome.runtime.onMessage.addListener(function (args, sender, sendResponse) {
  console.log(args, "??");
  if (args.type == "run") {
    const month = args.payload.month;
    const includeDay = args.payload.includeDay;
    onHandleData(month, includeDay).then((res) => {
      downloadExcel(res.exportExcelData);
    });
  }
  if (args.type == "calc") {
    const month = args.payload.month;
    const includeDay = args.payload.includeDay;
    onHandleData(month, includeDay).then((res) => {
      sendResponse({
        payload: {
          type: "calc",
          renderHourText: res.renderHourText,
          renderMinText: res.renderMinText,
        },
      });
    });
  }

  return true;
});
