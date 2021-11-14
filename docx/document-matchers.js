export {
  isEmptyRun,
  isRun,
  isText,
  isHyperlink,
  isTable,
  isRow
};

function isEmptyRun() {
  return isRun({children: []});
}

var hamjest = require("hamjest");
var _ = require("underscore");

var documents = require("../../lib/documents");

function isRun(properties) {
    return isDocumentElement(documents.types.run, properties);
}

function isText(text) {
    return isDocumentElement(documents.types.text, {value: text});
}

function isHyperlink(properties) {
    return isDocumentElement(documents.types.hyperlink, properties);
}

function isTable(options) {
    return isDocumentElement(documents.types.table, options);
}

function isRow(options) {
    return isDocumentElement(documents.types.tableRow, options);
}

function isDocumentElement(type, properties) {
    return hamjest.hasProperties(_.extend({type: hamjest.equalTo(type)}, properties));
}
