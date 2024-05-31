const btn = document.getElementById("submit");
const select = document.getElementById("selectedMonth");
const includeDay = document.getElementById("includesDay");
const link = document.getElementById("link");

select.value = Number(new Date().getMonth()) + 1;
includeDay.checked = false;

// 可以获取到background.js中设置的函数,
const background = chrome.extension.getBackgroundPage();
// 点击按钮getBackgroundPage()
btn.onclick = function (e) {
  chrome.runtime.sendMessage({
    type: "start",
    payload: {
      month: select.value - 1,
      includeDay: includeDay.checked,
    },
  });
};

link.onclick = function () {
  window.open(
    "https://open.feishu.cn/open-apis/authen/v1/user_auth_page_beta?app_id=cli_a5fbe12e2278d013&redirect_uri=https%3A%2F%2Fhonghaioffice.tastien-external.com%2Ffastdev%2Fapi%2Flark%2Foauth2%2Fsso%3FagentId%3Dcli_a5fbe12e2278d013%26toUrl%3DL1JlZHNlYVBsYXRmb3JtL2Zyb250L21vYmlsZS9pbmRleC5odG1sIy9hdHRlbmRhbmNlL2txX2NvdW50X3BlcnNvbj95ZWFyTW9udGg9MjAyNC0wNQ%3D%3D%26bind%3D1%26bindPage%3D1%26client%3Dlark&state="
  );
};
