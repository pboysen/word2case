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
    	"p[style-name='MultipleChoice'] => ul.mchoice > li:fresh",
      "p[style-name='Component'] => div.component:fresh"
    ]
};

const componentTypes = [
  "textfield-widget",
  "textarea-widget",
  "select-widget",
  "carry-forward"
];

document.getElementById("cancel").addEventListener("click", () => {
  window.close();
});

var err = document.getElementById("droperror");

var dropZone = document.getElementById("dropZone");
dropZone.addEventListener('dragover', e => {
    e.stopPropagation();
    e.preventDefault();
});

dropZone.addEventListener('drop', e => {
  e.stopPropagation();
  e.preventDefault();
  var files = [];
  if (e.dataTransfer.items) {
    for (var i = 0; i < e.dataTransfer.items.length; i++) {
      if (e.dataTransfer.items[i].kind === "file") {
        files.push(e.dataTransfer.items[i].getAsFile());
      }
    }
  }
  handleFiles(files);
});

var uploadFile = document.getElementById("uploadFile");
uploadFile.addEventListener("change", e => {
  e.stopPropagation();
  e.preventDefault();
  handleFiles(uploadFile.files);
});

function handleFiles(files) {
  const docxtype =
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (files.length == 1) {
    if (files[0].type === docxtype) getPhases(files[0]);
    else err.innerHTML = "Only .docx files can be read.";
  } else err.innerHTML = "Please select one file.";
}

function liInputs(doc, listItems, type, name, value) {
  for (let li of listItems) {
    var choiceName = type == "checkbox" ? name + "." + value : name;
    var input = doc.createElement("input");
    input.type = type;
    input.name = name;
    input.value = choiceName;
    li.insertBefore(input, li.firstChild);
  }
}

// insert input checkboxes or radio buttons
function transformLists(doc, qtype, type, prefix) {
  for (let list of doc.getElementsByTagName("ul")) {
    var q = 1;
    if (list.className === qtype)
      liInputs(doc, list.getElementsByTagName("li"), type, prefix, q++);
  }
}

// remove extra paragraphs from table cells
function transformTables(doc) {
  for (let td of doc.getElementsByTagName("li")) {
    for (let p of td.getElementsByTagName("p")) {
      while (p.firstChild) {
        var child = p.firstChild;
        p.removeChild(child);
        p.parentElement.appendChild(child);
      }
      p.parentElement.removeChild(p);
    }
  }
}

function removeEmptyParagraphs(doc) {
  for (let p of doc.getElementsByTagName("p"))
    if (!p.firstChild) p.parentElement.removeChild(p);
}

var cid = 1;
function transformComponents(doc) {
  var components = {};
  for (let div of doc.getElementsByTagName("div")) {
    if (div.className === "component") {
      div.id = `cid${cid++}`;
      var type = div.textContent.trim().toLowerCase();
      if (componentTypes.includes(type)) components[div.id] = type;
      else errors += `${type} is not a component type.<br />`;
      while (div.firstChild)
        div.removeChild(div.firstChild);
    }
  }
  return components;
}

// remove <head></head><body> and </body>
function transformHTML(doc) {
  let str = doc.documentElement.innerHTML;
  return str.substring(19, str.length - 7);
}

function transformPhase(html) {
  var doc = new DOMParser().parseFromString(html, "text/html");
	transformLists(doc, "mchoice", "radio", "mc");
  transformLists(doc, "chklist", "checkbox", "cl");
  transformTables(doc);
  removeEmptyParagraphs(doc);
  var components = transformComponents(doc);
  var contents = transformHTML(doc);
  return {
    content: contents,
    components: components
  };
}

function processDocx(arrayBuffer, cb) {
  return convertToHtml({
    arrayBuffer: arrayBuffer
  }, options).then(function (e) {
    var phases = [];
    var pid = 0;
    e.value.split("<p><page /></p>").forEach(html => {
      let obj = transformPhase(html);
      phases.push({
        title: `phase${pid + 1}`,
        id: pid++,
        submit: "Submit",
        components: obj.components,
        content: obj.content
      });
    });
    cb(phases);
  });
}

var errors;
function getPhases(file) {
  var that = this;
  err.style.visibility = "hidden";
  err.innerHTML = "";
  errors = "";
  var reader = new FileReader();
  reader.onload = function (e) {
    processDocx(reader.result, function (phases) {
      if (errors) {
        err.style.visibility = "visible";
        err.innerHTML = `<p>Please correct the following:</p><p>${errors}</p>`;
      } else {
        let doc = {
          fileName: file.name,
          phases: phases
        };
        localStorage.setItem("allele", JSON.stringify(doc));
      }
    }).done();
  };
  reader.readAsArrayBuffer(file);
}

/*--------------------------------------------------------
                  mammoth code
----------------------------------------------------------*/

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
}
