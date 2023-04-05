"use strict";

function MyCCManager() {}

MyCCManager.prototype.ccDebugMode = false
MyCCManager.prototype.selectedText = ""
MyCCManager.prototype.selectedNumber = 0
MyCCManager.prototype.selectedNumberFixed = 2
MyCCManager.prototype.selectedCurrency = {}
MyCCManager.prototype.exchangeRatesKey = "exchange_rates"
MyCCManager.prototype.myCCDisabledKey = "mycc_disabled"
MyCCManager.prototype.exchangeRatesKeyTTL = 10
MyCCManager.prototype.exchangeRates = {}
MyCCManager.prototype.isDebugActive = function() {
    return this.ccDebugMode
}

// toast template
MyCCManager.prototype.getToastTemplate = function() {
    return `<div id="myCurrencyConverter">
        <div class="toast-container bottom end p-3">
            <div class="toast fade">
                <div class="toast-header">
                    <strong class="me-auto"></strong>
                    <small></small>
                    <button type="button" class="btn-close">&#x2715;</button>
                </div>
                <div class="toast-body"></div>
                <div class="toast-footer">
                    <button type="button" class="btn-disable" title="Deactivate extension">&#10564; Deactivate Extension &#10562;</button>
                </div>
            </div>
        </div>
        <div class="toast-enable bottom-up end">
            <button type="button" class="btn-enable" title="Activate extension">&#10564;</button>
        </div>
    </div>`
}

// toast currency list template
MyCCManager.prototype.getCurrencyListTemplate = function(currencyList) {
    let template = '<ul class="list-group">'
    if (currencyList.length > 0) {
        currencyList.sort(function(a, b) {
            return a.crossorder - b.crossorder;
        })

        currencyList.forEach(currency => {
            if(!currency.banknotebuying) {
                return;
            }
            
            // add currency item
            template += this.getCurrencyItemTemplate(currency)
        })
    }
    template += '</ul>'
    return template
}

MyCCManager.prototype.getCurrencyItemTemplate = function(currency) {
    // console.log("çevrim", this.selectedNumber, currency.currencyname, currency.banknotebuying, (this.selectedNumber/currency.banknotebuying).toFixed(this.selectedNumberFixed))
    return '<li class="list-group-item" title="' + currency.currencyname + '">'
        + '<div class="me-auto">' + currency.currencycode + '</div>'
        + '<span class="badge">' + this.currencyFormat(currency.currencycode, (this.selectedNumber/currency.banknotebuying).toFixed(this.selectedNumberFixed)) + '</span>' 
        + '</li>'
}

// format currency for human readable
MyCCManager.prototype.currencyFormat = function(currencycode, currency) {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: currencycode, maximumFractionDigits: this.selectedNumberFixed}).format(currency)
}

// Convert XML to JSON
// via: https://davidwalsh.name/convert-xml-json
MyCCManager.prototype._convertXmlToJson = function(xml) {
    let exchangeRates = {}
    let tarih_date = xml.getElementsByTagName("Tarih_Date")
    if (tarih_date.length > 0) {
        for (let index = 0; index < tarih_date.length; index++) {
            // collect attr
            if (tarih_date[index].hasAttributes()) {
                exchangeRates["meta"] = {}
                for (let j = 0; j < tarih_date[index].attributes.length; j++) {
                    let attribute = tarih_date[index].attributes.item(j)
                    exchangeRates["meta"][attribute.nodeName.toLowerCase()] = attribute.nodeValue
                }
            }

            // collect child nodes
            let currency = tarih_date[index].getElementsByTagName("Currency")
            if (currency.length > 0) {

                exchangeRates["currency"] = {}
                for(let i = 0; i < currency.length; i++) {
                    let currentCurrency = null
                    let currentCurrencyMeta = {}
                    let item = currency.item(i)

                    // collect attr
                    if (item.hasAttributes()) {
                        for (let j = 0; j < item.attributes.length; j++) {
                            let attribute = item.attributes.item(j)
                            
                            if (attribute.nodeName.toLowerCase() === "currencycode") {
                                currentCurrency = attribute.nodeValue
                                exchangeRates["currency"][currentCurrency] = {}
                            }

                            currentCurrencyMeta[attribute.nodeName.toLowerCase()] = attribute.nodeValue
                        }
                    }

                    exchangeRates["currency"][currentCurrency] = Object.assign({}, currentCurrencyMeta)

                    if (item.hasChildNodes()) {
                        for(let k = 0; k < item.childNodes.length; k++) {
                            let citem = item.childNodes.item(k)

                            if (citem.hasChildNodes()) {
                                exchangeRates["currency"][currentCurrency][citem.nodeName.toLowerCase()] = (citem.childNodes[0].nodeValue).trim()
                            } else {
                                if (citem.nodeName != "#text") {
                                    exchangeRates["currency"][currentCurrency][citem.nodeName.toLowerCase()] = ""
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    return exchangeRates
}

// get selected text
// via: https://www.geeksforgeeks.org/how-to-get-the-highlighted-selected-text-in-javascript/
MyCCManager.prototype.getSelectedText = function() {
    let selectedText = ''

    if (window.getSelection) {
        // window.getSelection
        selectedText = window.getSelection().toString()
    } else if (document.getSelection) {
        // document.getSelection
        selectedText = document.getSelection().toString()
    } else if (document.selection) {
        // document.selection
        selectedText = document.selection.createRange().text
    }

    // To write the selected text into the textarea
    //document.testform.selectedtext.value = selectedText;
    selectedText = selectedText.trim()

    if (selectedText.length > 0 && selectedText != this.selectedText) {
        // check selected text must be Number: extract only numeric value
        const regex = /[\d.,]+/g;
        const numericVal = regex.exec(selectedText)
        //console.log("NNOOOOOO", numericVal);
        if (!!numericVal && numericVal.length > 0) {
            //console.log("NNEEEEE", numericVal[0])

            this.selectedText = numericVal[0]
            if (this.selectedText.startsWith('0')) {
                this.selectedNumberFixed = 5
                this.selectedNumber = Number.parseFloat(this.selectedText.replace(",", ".")).toFixed(this.selectedNumberFixed)
            } else {
                this.selectedNumberFixed = 2
                this.selectedNumber = Number.parseFloat(this.selectedText.replaceAll(".", "").replace(",", ".")).toFixed(this.selectedNumberFixed)
            }

            this.selectedCurrency = {
                crossorder: "0",
                kod: "TRY",
                currencycode: "TRY",
                currencyname: "Turkish Lira",
                unit: "1",
                banknotebuying: "1"
            }
            
            return true
        }
    }

    return false
}