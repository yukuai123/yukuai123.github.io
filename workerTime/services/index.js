import request from "../utils/request";
import { formatQueryParams } from "../utils/tools";

/** 查询用户信息 */
export async function queryUserInfo() {
  return request.post(
    `https://honghaioffice.tastien-external.com/RedseaPlatform/PtUsers.mc?method=getCurUserInfo`
  );
}

/** 查询上班时长 */
export async function querySbDays({ staff_id: staffId, userId, begin, end }) {
  return request.post(
    `https://honghaioffice.tastien-external.com/RedseaPlatform/getList/kq_count_abnormal_SelectStaffID/CoreRequest.mc`,
    formatQueryParams({
      staff_id: staffId,
      userId,
      begin,
      end,
    }).slice(1),
    {
      headers: {
        "content-type": `application/x-www-form-urlencoded`,
      },
    }
  );
}

/** 查询日考勤详情 */
export async function querySbDayDetail({ staffId, workDay }) {
  return request.post(
    `https://honghaioffice.tastien-external.com/RedseaPlatform/redmagicapi/rf_s_kq_count_SelectStaffIDDaily/getExecuteResult.mc`,
    formatQueryParams({
      work_day: workDay,
      staff_id: staffId,
    }).slice(1),
    {
      headers: {
        "content-type": `application/x-www-form-urlencoded`,
      },
    }
  );
}
