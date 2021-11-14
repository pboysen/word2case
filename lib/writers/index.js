export {
  writer
};

var htmlWriter = require("./html-writer");
// var markdownWriter = require("./markdown-writer");

function writer(options) {
    options = options || {};
    return htmlWriter.writer(options);
}
