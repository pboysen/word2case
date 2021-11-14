export {
  freshElement,
  nonFreshElement,
  elementWithTag,
  text,
  forceWrite,
  simplify,
  write
};

var ast = require("./ast");

var freshElement = ast.freshElement;
var nonFreshElement = ast.nonFreshElement;
var elementWithTag = ast.elementWithTag;
var text = ast.text;
var forceWrite = ast.forceWrite;
var simplify = require("./simplify");

function write(writer, nodes) {
  nodes.forEach(function(node) {
    writeNode(writer, node);
  });
}

function writeNode(writer, node) {
  toStrings[node.type](writer, node);
}

var toStrings = {
  element: generateElementString,
  text: generateTextString,
  html: generateHtmlString,
  forceWrite: function() { }
};

function generateElementString(writer, node) {
  if (ast.isVoidElement(node)) {
    writer.selfClosing(node.tag.tagName, node.tag.attributes);
  } else {
    writer.open(node.tag.tagName, node.tag.attributes);
    write(writer, node.children);
    writer.close(node.tag.tagName);
  }
}

function generateTextString(writer, node) {
  writer.text(node.value);
}

function generateHtmlString(writer, node) {
  writer._append(node.value);
}
