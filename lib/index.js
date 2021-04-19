var _ = require("underscore");

var docxReader = require("./docx/docx-reader");
var docxStyleMap = require("./docx/style-map");
var DocumentConverter = require("./document-to-html").DocumentConverter;
var readStyle = require("./style-reader").readStyle;
var readOptions = require("./options-reader").readOptions;
var unzip = require("./unzip");
var Result = require("./results").Result;
var md5 = require("md5");

const options = {
    styleMap: [
			"p[style-name='Checklist'] => ul.chklist > li:fresh",
    	"p[style-name='MultipleChoice'] => ul.mchoice > li:fresh"
    ]
};

document.getElementById("cancel").addEventListener("click", () => {
  window.localStorage.removeItem("phases");
});

var err = document.getElementById("droperror");
var dropZone = document.getElementById('dropZone');

dropZone.addEventListener('dragover', e => {
    e.stopPropagation();
    e.preventDefault();
});

// Get file data on drop
dropZone.addEventListener('drop', e => {
  e.stopPropagation();
  e.preventDefault();
  const docxtype =
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  var files = [];
  if (e.dataTransfer.items) {
    for (var i = 0; i < e.dataTransfer.items.length; i++) {
      if (e.dataTransfer.items[i].kind === "file") {
        files.push(e.dataTransfer.items[i].getAsFile());
      }
    }
  }
  if (files.length == 1) {
    if (files[0].type === docxtype) getPhases(files[0]);
    else err.innerHTML = "Only .docx files can be read.";
  } else err.innerHTML = "Please drop only one file.";
});

var pcCnt = 1;
function pcName() {
	return "pc" + pcCnt++;
}

function inputElement(type, name, value) {
  return `<input type="${type}" name="${name}" value="${value}"/>`;
}

function textareaElement(name) {
  return `<textarea name="${name}"></textarea>`;
}

function selectElement(name) {
  return `<select name="${name}"></select>`;
}

var pcType = {
  "37342cf8c81dc4e71d5d268fb94902a9": inputElement("text",pcName(),""),
  "709389a08ea44a071b82b11964f87ac6": textareaElement(pcName()),
  "7870eab95c886f70870c2e8815b3fc8f": selectElement(pcName())
};

function liInputs(listItems, type, name) {
  var liRE = /<li>(.*?)<\/li>/g;
  var value = 1;
  return listItems.replaceAll(liRE, function (match, liText) {
    var choiceName = type == "checkbox" ? name + "." + value : name;
    return "<li>".concat(inputElement(type, choiceName, value++)).concat(liText, "</li>");
  });
}

function transformList(html, qtype, type, prefix) {
  var ulRE = new RegExp(`<ul class="${qtype}">(.*?)</ul>`, "g");
  var q = 1;
  return html.replaceAll(ulRE, function (match, listItems) {
		var lis = liInputs(listItems, type, prefix + q++);
  	return `<ul class="${qtype}">${lis}</ul>`;
  });
}

function transform(html) {
	var result = transformList(html, "mchoice", "radio", "mc");
  result = transformList(result, "chklist", "checkbox", "cl");
	var replacements = [{
	  from: /<td([^>]*)><p[^>]*>([^<]*)<\/p>(<p>[^<]*<\/p>)*<\/td>/g,
	  to: "<td$1>$2$3</td>"
	}, {
	  from: /<img.*src="[^;]*;base64,([^"]*)"\s\/>/g,
	  to: function to(match, data) {
	    var type = pcType[md5(data)];
	    return type ? type : match;
	  }
	}];
  return replacements.reduce(function (result, repl) {
    return result.replace(repl.from, repl.to);
  }, result);
}

function processDocx(arrayBuffer, cb) {
  return convertToHtml({
    arrayBuffer: arrayBuffer
  }, options).then(function (e) {
    var phases = [];
    var id = 1;
    transform(e.value).split("<p><page /></p>").forEach(function (page) {
      phases.push({
        title: "phase".concat(id),
        id: id++,
        text: page
      });
    });
    cb(phases);
  });
}

function getPhases(file) {
  var that = this;
  var reader = new FileReader();
  reader.onload = function (e) {
    processDocx(reader.result, function (phases) {
      window.localStorage.setItem("fileName", file.name);
      window.localStorage.setItem("phases", JSON.stringify(phases));
    }).done();
  };
  reader.readAsArrayBuffer(file);
}

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

exports.styleMapping = function() {
  throw new Error('Use a raw string instead of mammoth.styleMapping e.g. "p[style-name=\'Title\'] => h1" instead of mammoth.styleMapping("p[style-name=\'Title\'] => h1")');
};
