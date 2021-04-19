var htmlWriter = require("./html-writer");
// var markdownWriter = require("./markdown-writer");

exports.writer = writer;


function writer(options) {
    options = options || {};
    return htmlWriter.writer(options);
}
