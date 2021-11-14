export {
  readMathElement
};

import { omml2mathml } from "omml2mathml";

var DOMParser = require('xmldom').DOMParser;

function getXML(node) {
  let attrString = "";
  if (node.value) {
    return node.value;
  }
  if (!node.children) {
    return "";
  }
  let attrs = node.attributes;
  if (attrs && Object.entries(attrs).length) {
    Object.entries(attrs).forEach(([key, value]) => {
      // change key name coming from google docs
      if (key === "{http://www.w3.org/XML/1998/namespace}space") {
        key = "xml:space";
      }
      attrString += ` ${key}="${value}"`;
    });
  }
  if (node.children.length > 0) {
    let content = "";
    for (let child of node.children) {
      content += getXML(child);
    }
    return `<${node.name}${attrString}>${content}</${node.name}>`;
  } else {
    return `<${node.name}${attrString}/>`;
  }
}

function readMathElement(element) {
  var xml = getXML(element);
  xml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">` +
    `${xml}` +
    `</w:document>`;
  var xmlDoc = new DOMParser().parseFromString(xml, 'text/xml');
  let mathml = omml2mathml(xmlDoc);
  return mathml.outerHTML;
}
