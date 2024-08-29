"use strict";

// Manifest json file to object data
let manifestData = chrome.runtime.getManifest();

// Fired when the extension is first installed, when the extension is updated to a new version, and when the browser is updated to a new version.
chrome.runtime.onInstalled.addListener(function () {
  console.info(
    "%c" + manifestData.name + " Extension: %cWelcome to my world!",
    "color: orange;",
    "color: default;"
  );
});

// currency converter api request listener
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  //console.log("bg", request, sender, sendResponse)
  if (request.name === "exchange-rates") {
    fetch(_findUrlFromManifest(), {
      method: "GET",
      redirect: "follow",
      credentials: 'include', // header cookie accept
      // headers: {
      //   "content-type": "text/xml",
      // },
    })
      .then((resp) => resp.text())
      .then((data) => {
        return sendResponse({
            status: true,
            result: data
        });
      })
      .catch((e) => {
        //console.warn("fetch Error", e);

        return sendResponse({
          status: false,
          message: "internal server error. something wrong!",
        });
      });
  }

  return true; // last error fixed
});

function _findUrlFromManifest() {
  let version = manifestData.manifest_version;

  let url = "";
  if (version === 2) {
    url = manifestData.permissions[0];
  } else if (version === 3) {
    url = manifestData.host_permissions[0];
  }

  return url;
};
