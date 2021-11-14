export {
  paragraph,
  run,
  table,
  bold,
  italic,
  underline,
  strikethrough,
  smallCaps,
  commentReference,
  lineBreak,
  pageBreak,
  columnBreak,
  equalTo,
  startsWith
};

var bold = new Matcher("bold");
var italic = new Matcher("italic");
var underline = new Matcher("underline");
var strikethrough = new Matcher("strikethrough");
var smallCaps = new Matcher("smallCaps");
var commentReference = new Matcher("commentReference");
var lineBreak = new Matcher("break", {breakType: "line"});
var pageBreak = new Matcher("break", {breakType: "page"});
var columnBreak = new Matcher("break", {breakType: "column"});

function paragraph(options) {
    return new Matcher("paragraph", options);
}

function run(options) {
    return new Matcher("run", options);
}

function table(options) {
    return new Matcher("table", options);
}

function Matcher(elementType, options) {
    options = options || {};
    this._elementType = elementType;
    this._styleId = options.styleId;
    this._styleName = options.styleName;
    if (options.list) {
        this._listIndex = options.list.levelIndex;
        this._listIsOrdered = options.list.isOrdered;
    }
}

Matcher.prototype.matches = function(element) {
    return element.type === this._elementType &&
        (this._styleId === undefined || element.styleId === this._styleId) &&
        (this._styleName === undefined || (element.styleName && this._styleName.operator(this._styleName.operand, element.styleName))) &&
        (this._listIndex === undefined || isList(element, this._listIndex, this._listIsOrdered)) &&
        (this._breakType === undefined || this._breakType === element.breakType);
};

function isList(element, levelIndex, isOrdered) {
    return element.numbering &&
        element.numbering.level == levelIndex &&
        element.numbering.isOrdered == isOrdered;
}

function equalTo(value) {
    return {
        operator: operatorEqualTo,
        operand: value
    };
}

function startsWith(value) {
    return {
        operator: operatorStartsWith,
        operand: value
    };
}

function operatorEqualTo(first, second) {
    return first.toUpperCase() === second.toUpperCase();
}

function operatorStartsWith(first, second) {
    return second.toUpperCase().indexOf(first.toUpperCase()) === 0;
}
