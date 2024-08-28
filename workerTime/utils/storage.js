/** 仅仅能在background.js content.js popup.js 中 或者对应html中使用 */
export default class Storage {
  /** 批量更新 */
  static set(items) {
    return chrome.storage.local.set(items);
  }

  static update(key, value) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get().then((res) => {
        chrome.storage.local
          .set({ ...res, [key]: value })
          .then(resolve)
          .catch(reject);
      });
    });
  }

  static updateBatch(items) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get().then((res) => {
        chrome.storage.local
          .set({ ...res, ...items })
          .then(resolve)
          .catch(reject);
      });
    });
  }

  static get() {
    return chrome.storage.local.get();
  }

  static getItem(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local
        .get()
        .then((res) => {
          resolve((res || {})[key]);
        })
        .catch(reject);
    });
  }

  static remove(keys) {
    return chrome.storage.local.remove(keys);
  }

  static clear() {
    return chrome.storage.local.clear();
  }
}
