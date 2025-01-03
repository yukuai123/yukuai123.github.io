import { EFFECT_HOSTS } from "./consts";
import { validURL } from "./tools";

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
        if (validURL(item.url)) {
          const url = new URL(item.url);
          return EFFECT_HOSTS.some((host) => url.host.includes(host));
        }
      });

      const activeTab = list.find((item) => item.active);
      if (activeTab) {
        return resolve(activeTab.id);
      }

      if (list[0]) {
        return resolve(list[0].id);
      }

      if (pickOne) {
        const target = tabs.filter((i) => validURL(i.url))[0];
        return resolve(target ? target.id : null);
      }

      resolve(null);
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

export function isExistValidTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({}, (tabs) => {
      const target = tabs.find((item) => validURL(item.url));
      resolve(!!target);
    });
  });
}

//  动态注入content.js
export async function injectContentJs(tab) {
  // 只给合法的url注入js
  if (tab && validURL(tab.url)) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["./js/content.js"],
    });
  } else {
    // 给所有合法的的tab注入js
    const tabs = await chrome.tabs.query({});
    tabs.forEach((item) => {
      if (validURL(item.url)) {
        chrome.scripting.executeScript({
          target: { tabId: item.id },
          files: ["./js/content.js"],
        });
      }
    });
  }
}
