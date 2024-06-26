function queryTabId() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({}).then((tabs) => {
      const list = tabs.filter((item) => {
        const url = new URL(item.url);
        const isHomePage = url.host.includes(
          "honghaioffice.tastien-external.com"
        );
        return isHomePage;
      });

      const target = list.find((i) => i.active) || list[0];

      resolve(target ? target.id : null);
    });
  });
}

function handler(type, payload, sendResponse) {
  switch (type) {
    case "start": {
      queryTabId().then((id) => {
        if (id) {
          chrome.tabs.sendMessage(id, { type: "run", payload });
        }
      });
      break;
    }
    case "calc": {
      queryTabId().then((id) => {
        if (id) {
          chrome.tabs.sendMessage(
            id,
            {
              type: "calc",
              payload: Object.assign(payload, { id }),
            },
            (payload) => {
              sendResponse(payload);
            }
          );
        }
      });
      break;
    }
    case "calcOnline": {
      queryTabId().then((id) => {
        if (id) {
          chrome.tabs.sendMessage(
            id,
            {
              type: "calcOnline",
              payload: Object.assign(payload, { id }),
            },
            () => {
              chrome.tabs.create({ url: "./view/calc.html" });
            }
          );
        }
      });
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
