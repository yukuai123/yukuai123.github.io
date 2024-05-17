function handler (type, payload) {
  switch (type) {
    case "start": {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        console.log("tabs", '接收', tabs);
        tabs.forEach(item => {
          const isHomePage =  item.url.includes("honghaioffice.tastien-external.com");
          if (isHomePage) {
            const id = item.id;
            chrome.tabs.sendMessage(id, { type: "run", payload });
          }
        })
      });
    }
  }
};

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type) {
    handler(request.type, request.payload);
  }
});
