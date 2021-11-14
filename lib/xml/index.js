export {
  Element,
  element,
  text,
  readString,
  writeString
};

var nodes = require("./nodes");

var Element = nodes.Element;
var element = nodes.element;
var text = nodes.text;
var readString = require("./reader").readString;
var writeString = require("./writer").writeString;
