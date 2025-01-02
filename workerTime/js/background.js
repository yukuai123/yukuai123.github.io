import {
  injectContentJs,
  closeChromeViewPage,
  chromeTabsSendMessage,
  queryChromeActiveTabId,
} from "../utils/native";

async function handler(type, payload, sendResponse) {
  const id = await queryChromeActiveTabId();
  if (!id) {
    sendResponse();
    const targetId = await queryChromeActiveTabId(true);
    chromeTabsSendMessage(targetId, { type: "openAuth" });
    const extensionId = chrome.runtime.id;
    if (targetId === extensionId) {
      return;
    }
  }
  switch (type) {
    case "exportExcel": {
      if (id) {
        chromeTabsSendMessage(id, { type: "exportExcel", payload }, () => {
          sendResponse();
        });
      }
      break;
    }
    case "calc": {
      if (id) {
        chromeTabsSendMessage(id, { type: "calc" }, (payload) => {
          sendResponse(payload);
        });
      }
      break;
    }
    case "calcOnline": {
      if (id) {
        chromeTabsSendMessage(id, { type: "calcOnline" }, (data) => {
          if (data?.payload?.type === "calcOnline") {
            chrome.tabs.create({ url: "./view/calc.html" });
          }
        });
      }
      break;
    }
    case "calcOnlineView": {
      await closeChromeViewPage();
      chrome.tabs.create({ url: "./view/calc.html" });
      break;
    }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  injectContentJs();
  chrome.runtime.onMessage.addListener(function (
    request,
    sender,
    sendResponse
  ) {
    if (request.type) {
      handler(request.type, request.payload, sendResponse);
    }

    return true;
  });
});
