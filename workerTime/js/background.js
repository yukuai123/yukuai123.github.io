import { chromeTabsSendMessage, queryChromeActiveTabId } from "../utils/native";

async function handler(type, payload, sendResponse) {
  const id = await queryChromeActiveTabId();
  switch (type) {
    case "start": {
      if (id) {
        chromeTabsSendMessage(id, { type: "run", payload });
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
        chromeTabsSendMessage(id, { type: "calcOnline" }, () => {
          chrome.tabs.create({ url: "./view/calc.html" });
        });
      }
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
