export default {
  convertToHtml,
  convertToMarkdown,
  embedStyleMap,
  extractRawText,
  readEmbeddedStyleMap,
  styleMapping
};

var styleMapping = function() {
  throw new Error('Use a raw string instead of mammoth.styleMapping e.g. "p[style-name=\'Title\'] => h1" instead of mammoth.styleMapping("p[style-name=\'Title\'] => h1")');
};

var _ = require("underscore");
var docxReader = require("./docx/docx-reader");
var docxStyleMap = require("./docx/style-map");
var DocumentConverter = require("./document-to-html").DocumentConverter;
var readStyle = require("./style-reader").readStyle;
var readOptions = require("./options-reader").readOptions;
var unzip = require("./unzip");
var Result = require("./results").Result;

function convertToHtml(input, options) {
  return convert(input, options);
}

function convertToMarkdown(input, options) {
  var markdownOptions = Object.create(options || {});
  markdownOptions.outputFormat = "markdown";
  return convert(input, markdownOptions);
}

function convert(input, options) {
  options = readOptions(options);
  return unzip.openZip(input)
    .tap(function(docxFile) {
      return docxStyleMap.readStyleMap(docxFile).then(function(map) {
        options.embeddedStyleMap = map;
      });
    })
    .then(function(docxFile) {
      return docxReader.read(docxFile, input)
        .then(function(documentResult) {
          return documentResult.map(options.transformDocument);
        })
        .then(function(documentResult) {
          return convertDocumentToHtml(documentResult, options);
        });
    });
}

function readEmbeddedStyleMap(input) {
  return unzip.openZip(input)
    .then(docxStyleMap.readStyleMap);
}

function convertDocumentToHtml(documentResult, options) {
  var styleMapResult = parseStyleMap(options.readStyleMap());
  var parsedOptions = _.extend({}, options, {
    styleMap: styleMapResult.value
  });
  var documentConverter = new DocumentConverter(parsedOptions);
  return documentResult.flatMapThen(function(document) {
    return styleMapResult.flatMapThen(function(styleMap) {
        return documentConverter.convertToHtml(document);
    });
  });
}

function parseStyleMap(styleMap) {
  return Result.combine((styleMap || []).map(readStyle))
    .map(function(styleMap) {
      return styleMap.filter(function(styleMapping) {
          return !!styleMapping;
      });
  });
}


function extractRawText(input) {
  return unzip.openZip(input)
    .then(docxReader.read)
    .then(function(documentResult) {
      return documentResult.map(convertElementToRawText);
    });
}

function convertElementToRawText(element) {
  if (element.type === "text") {
    return element.value;
  } else {
    var tail = element.type === "paragraph" ? "\n\n" : "";
    return (element.children || []).map(convertElementToRawText).join("") + tail;
  }
}

function embedStyleMap(input, styleMap) {
  return unzip.openZip(input)
    .tap(function(docxFile) {
      return docxStyleMap.writeStyleMap(docxFile, styleMap);
    })
    .then(function(docxFile) {
      return {
        toBuffer: docxFile.toBuffer
      };
    });
}
