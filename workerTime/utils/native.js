import { EFFECT_HOSTS } from "./consts";

export const chromeRuntimeSendMessage = (data, callback) => {
  chrome.runtime.sendMessage(data, callback);
};

export const chromeTabsSendMessage = (tabId, data, callback) => {
  chrome.tabs.sendMessage(tabId, data, callback);
};

export const queryChromeActiveTabId = (pickOne = false) => {
  return new Promise((resolve) => {
    chrome.tabs.query({}).then((tabs) => {
      const list = tabs.filter((item) => {
        const url = new URL(item.url);
        return EFFECT_HOSTS.some((host) => url.host.includes(host));
      });

      const target =
        list.find((i) => i.active) || list[0] || pickOne ? tabs[0] : null;

      resolve(target ? target.id : null);
    });
  });
};

export const queryChromeViewPage = () => {
  return new Promise((resolve) => {
    chrome.tabs.query({}).then((tabs) => {
      const currentPluginId = chrome.runtime.id;
      const targetUrl = `chrome-extension://${currentPluginId}/view/calc.html`;

      const list = tabs.filter((item) => {
        return item.url === targetUrl;
      });

      resolve(list.length ? list : []);
    });
  });
};

export const closeChromeViewPage = () => {
  return queryChromeViewPage().then((list) => {
    list.forEach((item) => {
      chrome.tabs.remove(item.id);
    });
  });
};

//  动态注入content.js
export function injectContentJs() {
  // 动态注入content.js
  queryChromeActiveTabId(true).then((id) => {
    if (id) {
      chrome.scripting.executeScript(
        {
          target: { tabId: id },
          files: ["./js/content.js"],
        },
        () => {
          console.log("Content script injected into active tab.");
        }
      );
    }
  });
}
