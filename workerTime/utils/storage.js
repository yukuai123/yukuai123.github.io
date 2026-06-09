/** 仅仅能在background.js content.js popup.js 中 或者对应html中使用 */
export default class Storage {
  /** 批量更新 */
  static set(items) {
    return chrome.storage.local.set(items);
  }

  static update(key, value) {
    return chrome.storage.local.set({ [key]: value });
  }

  static updateBatch(items) {
    return chrome.storage.local.set(items);
  }

  static get() {
    return chrome.storage.local.get();
  }

  static getItem(key) {
    return chrome.storage.local.get(key).then((res) => (res || {})[key]);
  }

  static remove(keys) {
    return chrome.storage.local.remove(keys);
  }

  static clear() {
    return chrome.storage.local.clear();
  }
}
