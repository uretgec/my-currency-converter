"use strict";

// Init Managers
const myCCManager = new MyCCManager();
// myCCManager.ccDebugMode = true;

// document load
window.addEventListener("DOMContentLoaded", async function (evt) {
    if (myCCManager.isDebugActive()) console.log("content-script", "DOMContentLoaded", evt);

    // append toast template to body
    document.body.insertAdjacentHTML("beforeend", myCCManager.getToastTemplate());

    // listener for close button
    document.querySelector("#myCurrencyConverter .btn-close").addEventListener("click", function () {
        // hide toast block
        document.querySelector("#myCurrencyConverter .toast").classList.remove("show");
    });

    let myCCDisabled = await chrome.storage.local.get([myCCManager.myCCDisabledKey]);
    if (myCCDisabled.hasOwnProperty(myCCManager.myCCDisabledKey)) {
        // extension is disable
        document.querySelector("#myCurrencyConverter .toast-enable").classList.add("show");
    } else {
        // extension is enable
        document.querySelector("#myCurrencyConverter .toast-enable").classList.remove("show");
    }

    // listener for disable button
    document.querySelector("#myCurrencyConverter .btn-disable").addEventListener("click", function () {
        // hide toast block
        document.querySelector("#myCurrencyConverter .toast").classList.remove("show");

        // disabled mycc extension
        let ccDisabledData = {};
        ccDisabledData[myCCManager.myCCDisabledKey] = true;
        chrome.storage.local.set(ccDisabledData);

        // show btn-enable block
        document.querySelector("#myCurrencyConverter .toast-enable").classList.add("show");
    });

    // listener for enable button
    document.querySelector("#myCurrencyConverter .btn-enable").addEventListener("click", function () {
        // enable mycc extension
        chrome.storage.local.remove([myCCManager.myCCDisabledKey]);

        // show btn-enable block
        document.querySelector("#myCurrencyConverter .toast-enable").classList.remove("show");
    });
});

// via: https://w3c.github.io/selection-api/#dom-window-getselection
document.addEventListener("selectionchange", async function (evt) {
    //if (myCCManager.isDebugActive())console.log("Archor node - ", window.getSelection().anchorNode, window.getSelection());
    if (myCCManager.isDebugActive())console.log("Focus Node - ", myCCManager.selectedText);

    let myCCDisabled = await chrome.storage.local.get([myCCManager.myCCDisabledKey]);
    if (myCCDisabled.hasOwnProperty(myCCManager.myCCDisabledKey)) {
        if (myCCManager.isDebugActive()) console.log("content-script","disabled",myCCManager.myCCDisabledKey, myCCDisabled[myCCManager.myCCDisabledKey]);
        return;
    }

    // unix timestamp
    let now = Math.floor(Date.now() / 1000);

    // find selection text
    let ok = myCCManager.getSelectedText();
    if (ok) {
        // different selection text found
        if (myCCManager.isDebugActive()) console.log("content-script","selectionchange",myCCManager.selectedText);

        // check exchange rates from local storage
        let exchangeRates = await chrome.storage.local.get([myCCManager.exchangeRatesKey]);
        if (!exchangeRates.hasOwnProperty(myCCManager.exchangeRatesKey)) {

            // get exchange rates from TCMB
            let exchangeRatesResponse = await chrome.runtime.sendMessage({name: "exchange-rates"});
            
            if (myCCManager.isDebugActive()) console.log("exchangeRatesResponse", exchangeRatesResponse);

            if (!!exchangeRatesResponse && exchangeRatesResponse.status) {
                const parser = new DOMParser();
                const xml = parser.parseFromString(exchangeRatesResponse.result,"application/xml");
                exchangeRates = myCCManager._convertXmlToJson(xml);

                // Unix timestamp: seconds + lifetime (ttl)
                exchangeRates["ttl"] = now + myCCManager.exchangeRatesKeyTTL;

                // save exchange rates to local storage
                let exchangeRatesData = {};
                exchangeRatesData[myCCManager.exchangeRatesKey] = exchangeRates;
                chrome.storage.local.set(exchangeRatesData);
                
                if (myCCManager.isDebugActive()) console.log("exchangeRatesData", "saved", "storage");
            } else {
                if (myCCManager.isDebugActive()) console.log("exchangeRatesResponse", "error");
            }
        } else {
            exchangeRates = exchangeRates[myCCManager.exchangeRatesKey];
            if (now > exchangeRates.ttl) {
                chrome.storage.local.remove([myCCManager.exchangeRatesKey]);

                if (myCCManager.isDebugActive()) console.log("exchangeRatesData", "removed", "storage");
            }
        }

        // finaly exchange rates data ready to use
        if (myCCManager.isDebugActive()) {
            
            console.log("Exchange Rates",now,exchangeRates.ttl,typeof exchangeRates,exchangeRates);

            // start convert
            console.log("Convert", exchangeRates.meta.date);
            let tables = [];
            Object.values(exchangeRates.currency).forEach((currency) => {
                tables.push([
                currency.currencycode,
                currency.banknotebuying
                    ? currency.banknotebuying
                    : currency.forexbuying,
                currency.crossrateusd
                    ? currency.crossrateusd
                    : currency.crossrateother,
                ]);
            });
            console.table(tables);
        }

        // update toast template
        let toastTemplate = document.querySelector("#myCurrencyConverter");
        if (toastTemplate) {
            toastTemplate.querySelector(".toast-header strong").innerHTML ="&#10564; Currency Converter";
            toastTemplate.querySelector(".toast-header small").textContent = exchangeRates.meta.date;
            toastTemplate.querySelector(".toast-body").innerHTML = myCCManager.getCurrencyListTemplate(Object.values(exchangeRates.currency));
            toastTemplate.querySelector(".toast-body ul.list-group").insertAdjacentHTML("afterbegin", myCCManager.getCurrencyItemTemplate(myCCManager.selectedCurrency));
            toastTemplate.querySelector(".toast").classList.add("show");
        }
    } else {
        if (myCCManager.focusCCContainer()) {
            if (myCCManager.isDebugActive()) console.log("focus #myCurrencyConverter")
        } else {
            if (myCCManager.isDebugActive()) console.log("not focus #myCurrencyConverter")
            document.querySelector("#myCurrencyConverter .toast").classList.remove("show");
        }
    }
});
