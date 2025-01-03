import { onHandleData } from "./content.js";
import Storage from "../utils/storage";

/** 用于相响应授权完自动打开工时列表这个功能 */
Storage.get().then((res) => {
  const isTargetPage = location.href.includes(
    "https://honghaioffice.tastien-external.com/"
  );
  if (res.autoOpenTable && isTargetPage) {
    onHandleData().then(() => {
      chrome.runtime.sendMessage({
        type: "calcOnlineView",
      });
    });
  }
});
