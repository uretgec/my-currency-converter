"use strict";

// Init Managers
const myCCManager = new MyCCManager();
myCCManager.ccDebugMode = true;

// document load
window.addEventListener("DOMContentLoaded", function (evt) {
  if (myCCManager.isDebugActive())
    console.log("content-script", "DOMContentLoaded", evt);

  // append toast template to body
  document.body.insertAdjacentHTML("beforeend", myCCManager.getToastTemplate());
  
  // listener for close button
  document
    .querySelector("#myCurrencyConverter .btn-close")
    .addEventListener("click", function () {
      document
        .querySelector("#myCurrencyConverter .toast")
        .classList.toggle("show");
    });
  
  // listener for disable button
  document
    .querySelector("#myCurrencyConverter .btn-disable")
    .addEventListener("click", function () {
      document
        .querySelector("#myCurrencyConverter .toast")
        .classList.toggle("show");

        // içeriği buton haline getiriyoruz. disable olarak orada kalıyor ve bunu storage a kayıt ediyoruz.
        // disable olduğunda hiçbir işlem yapmıyor.
    });
});

// via: https://w3c.github.io/selection-api/#dom-window-getselection
document.addEventListener("selectionchange", async function (evt) {
  //console.log("Archor node - ", window.getSelection().anchorNode, window.getSelection());
  //console.log("Focus Node - ", myCCManager.getSelectedText());

  let now = Math.floor(Date.now() / 1000);

  // find selection text
  let ok = myCCManager.getSelectedText();
  if (ok) {
    // different selection text found
    if (myCCManager.isDebugActive())
      console.log(
        "content-script",
        "selectionchange",
        myCCManager.selectedText
      );

    // check exchange rates from local storage
    let exchangeRates = await chrome.storage.local.get([
      myCCManager.exchangeRatesKey,
    ]);
    if (!exchangeRates.hasOwnProperty(myCCManager.exchangeRatesKey)) {
      // get exchange rates from TCMB
      let exchangeRatesResponse = await chrome.runtime.sendMessage({
        name: "exchange-rates",
      });
      if (myCCManager.isDebugActive())
        console.log("exchangeRatesResponse", exchangeRatesResponse);

      if (!!exchangeRatesResponse && exchangeRatesResponse.status) {
        const parser = new DOMParser();
        const xml = parser.parseFromString(
          exchangeRatesResponse.result,
          "application/xml"
        );

        exchangeRates = myCCManager._convertXmlToJson(xml);
        // Unix timestamp: seconds + lifetime (ttl)
        exchangeRates["ttl"] = now + myCCManager.exchangeRatesKeyTTL;

        // save exchange rates to local storage
        let exchangeRatesData = {};
        exchangeRatesData[myCCManager.exchangeRatesKey] = exchangeRates;
        chrome.storage.local.set(exchangeRatesData);
        if (myCCManager.isDebugActive())
          console.log("exchangeRatesData", "saved", "storage");
      } else {
        if (myCCManager.isDebugActive())
          console.log("exchangeRatesResponse", "error");
      }
    } else {
      exchangeRates = exchangeRates[myCCManager.exchangeRatesKey];
      if (now > exchangeRates.ttl) {
        chrome.storage.local.remove([myCCManager.exchangeRatesKey]);

        if (myCCManager.isDebugActive())
          console.log("exchangeRatesData", "removed", "storage");
      }
    }

    // finaly exchange rates data ready to use
    if (myCCManager.isDebugActive()) {
        console.log(
            "Exchange Rates",
            now,
            exchangeRates.ttl,
            typeof exchangeRates,
            exchangeRates
          );

        // start convert
        console.log("Convert", exchangeRates.meta.date);
        let tables = [];
        Object.values(exchangeRates.currency).forEach((currency) => {
            tables.push([
                currency.currencycode,
                currency.banknotebuying ? currency.banknotebuying : currency.forexbuying,
                currency.crossrateusd ? currency.crossrateusd : currency.crossrateother,
            ]);
        });
        console.table(tables);
    }

    // update toast template
    let toastTemplate = document.querySelector("#myCurrencyConverter")
    if (toastTemplate) {
        toastTemplate.querySelector(".toast-header strong").textContent = "Currency Converter"
        toastTemplate.querySelector(".toast-header small").textContent = exchangeRates.meta.date
        toastTemplate.querySelector(".toast-body").innerHTML = myCCManager.getCurrencyListTemplate(Object.values(exchangeRates.currency))
        toastTemplate.querySelector(".toast-body ul.list-group").insertAdjacentHTML("afterbegin", myCCManager.getCurrencyItemTemplate(myCCManager.selectedCurrency))
    }

    document
        .querySelector("#myCurrencyConverter .toast")
        .classList.add("show")
  } else {

  }
});
