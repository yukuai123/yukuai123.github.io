import { EFFECT_HOSTS } from "./consts";

export const chromeRuntimeSendMessage = (data, callback) => {
  chrome.runtime.sendMessage(data, callback);
};

export const chromeTabsSendMessage = (tabId, data, callback) => {
  chrome.tabs.sendMessage(tabId, data, callback);
};

export const queryChromeActiveTabId = () => {
  return new Promise((resolve) => {
    chrome.tabs.query({}).then((tabs) => {
      const list = tabs.filter((item) => {
        const url = new URL(item.url);
        return EFFECT_HOSTS.some((host) => url.host.includes(host));
      });

      const target = list.find((i) => i.active) || list[0];

      resolve(target ? target.id : null);
    });
  });
};
