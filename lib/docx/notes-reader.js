export {
  createFootnotesReader,
  createEndnotesReader
};

var documents = require("../documents");
var Result = require("../results").Result;

var createFootnotesReader = createReader.bind(this, "footnote");
var createEndnotesReader = createReader.bind(this, "endnote");

function createReader(noteType, bodyReader) {
    function readNotesXml(element) {
        return Result.combine(element.getElementsByTagName("w:" + noteType)
            .filter(isFootnoteElement)
            .map(readFootnoteElement));
    }

    function isFootnoteElement(element) {
        var type = element.attributes["w:type"];
        return type !== "continuationSeparator" && type !== "separator";
    }

    function readFootnoteElement(footnoteElement) {
        var id = footnoteElement.attributes["w:id"];
        return bodyReader.readXmlElements(footnoteElement.children)
            .map(function(body) {
                return documents.Note({noteType: noteType, noteId: id, body: body});
            });
    }

    return readNotesXml;
}
