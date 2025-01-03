import {
  closeAuthTab,
  closeChromeViewPage,
  chromeTabsSendMessage,
  queryChromeActiveTabId,
  injectContentJs,
} from "../utils/native";

async function handler(type, payload, sendResponse) {
  const id = await queryChromeActiveTabId();

  if (!id) {
    try {
      sendResponse();
      const targetId = await queryChromeActiveTabId(true);
      chromeTabsSendMessage(targetId, { type: "openAuth" });
    } catch (e) {
      console.log(e, "error");
    }
    return;
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
            chrome.tabs.create({
              url: chrome.runtime.getURL("view/calc.html"),
            });
          }
        });
      }
      break;
    }
    case "calcOnlineView": {
      await closeChromeViewPage();
      chrome.tabs.create({
        url: chrome.runtime.getURL("view/calc.html"),
      });
      break;
    }
    case "tokenExpired": {
      closeAuthTab();
      chromeTabsSendMessage(id, { type: "openAuth" });
      break;
    }
  }
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type) {
    handler(request.type, request.payload, sendResponse);
  }

  return true;
});

chrome.runtime.onInstalled.addListener(function () {
  injectContentJs();
});
