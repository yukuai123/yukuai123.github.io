const btn = document.getElementById("submit");
const select = document.getElementById("selectedMonth");

select.value = Number(new Date().getMonth()) + 1

// 可以获取到background.js中设置的函数,
const background = chrome.extension.getBackgroundPage();
// 点击按钮getBackgroundPage()
btn.onclick = function (e) {
  chrome.runtime.sendMessage({ type: "start", payload: { month: select.value - 1 } });
};
