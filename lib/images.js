export {
  imgElement,
  inline,
  dataUri
};

var inline = imgElement;

var _ = require("underscore");

var promises = require("./promises");
var Html = require("./html");

function imgElement(func) {
  return function(element, messages) {
    if (!element.width) element.width = "24px";
    if (!element.height) element.height = "24px";
    return promises.when(func(element)).then(function(result) {
      var attributes = _.clone(result);
      if (element.altText) {
        attributes.alt = element.altText;
      }
      return [Html.freshElement("img", attributes, [])];
    });
  };
}

// Undocumented, but retained for backwards-compatibility with 0.3.x

var dataUri = imgElement(function(element) {
  return element.read("base64").then(function(imageBuffer) {
  return {
  width: element.width,
  height: element.height,
  src: "data:" + element.contentType + ";base64," + imageBuffer
  };
  });
});
