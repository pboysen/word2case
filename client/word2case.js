//import md5 from "md5";

const componentType = {
	"f1c836582a45f017b19421006f8e66ab": inputElement("text","txt1",""),
  "709389a08ea44a071b82b11964f87ac6": textareaElement("area"),
  "7870eab95c886f70870c2e8815b3fc8f": selectElement()
}

const options = {
    styleMap: [
    	"p[style-name='MultipleChoice'] => ul.mchoice > li:fresh",
    	"p[style-name='Checklist'] => ul.chklist > li:fresh"
    ]
};

document.getElementById("cancel").addEventListener("click", () => {
  window.localStorage.removeItem("phases");
});

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
    if (files[0].type === docxtype) docxFile(files[0]);
    else return "Only .docx files can be read.";
  } else return "Please drop only one file.";
});

function inputElement(type, name, value) {
	return `<input type="${type}" name="${name}" value="${value}">`;
}

function textareaElement(name) {
  return `<textarea name="para"></textarea>`;
}

function selectElement() {
  return `<select></select>`;
}

function liInputs(listItems, type, name) {
	var liRE = /<li>(.*?)<\/li>/g;
	let value = 1;
	return listItems.replaceAll(liRE, (match, liText) => {
		let choiceName = type == "checkbox"? name + "." + value : name;
		return `<li>${inputElement(type, choiceName, value++)}${liText}</li>`;
	});
}

function transformList(html, qtype, type, prefix) {
	var ulRE = new RegExp(`<ul class="${qtype}">(.*?)</ul>`,"g");
	let q = 1;
	return html.replaceAll(ulRE, (match, listItems) => {
		return `<ul class="${qtype}">${liInputs(listItems, type, prefix + q++)}</ul>`;
	});
}

var replacements = [
	{ from: /<td([^>]*)><p[^>]*>([^<]*)<\/p>(<p>[^<]*<\/p>)*<\/td>/g,
	  to: "<td$1>$2$3</td>" },
	{ from: /<img src="data:([^;]*);base64,([^"]*)"[^\/]*\/>/g,
	  to: (match, data) => {
		    const type = componentType[md5(data)];
		    return type ? type : match;
	    }
	}
]

function transform(html) {
	let result = replacements.reduce((result, repl) =>
    result.replace(repl.from, repl.to), html);
	result = transformList(result, "mchoice", "radio", "mc");
	result = transformList(result, "chklist", "checkbox", "cl");
	return result;
}

function docxFile(file) {
  let that = this;
  var reader = new FileReader();
  reader.onload = function(e) {
    processDocx({arrayBuffer: reader.result}, phases => {
      window.localStorage.setItem("fileName", file.name);
      window.localStorage.setItem("phases", phases);
      console.log(fileName, phases);
    })
    .done();
  };
	reader.readAsArrayBuffer(file);
}

function processDocx(arrayBuffer, cb) {
  convertToHtml(arrayBuffer, options)
		.then(function(e) {
			console.log(e);
      let phases = [];
      let id = 1;
      transform(e.target.result).split("<p><page /></p>").forEach(page => {
        phases.push({
          title: "`phase${id}`",
          id: id++,
          text: page
        });
      });
      cb(phases);
    });
}

/*
function caseFile(file) {
  fileBlob(file, blob => {
    let view = new DataView(blob);
    let len = view.getUint32(0);
    let reader = new FileReader();
    reader.onload = function() {
      let caseState = JSON.parse(reader.result);
      let url = URL.createObjectURL(new Blob([blob.slice(len + 4)]));
      eventbus.$emit("loadDocument", {
        url: url,
        setState: function setCaseState() {
          URL.revokeObjectURL(url);
          that.$store.commit("setState", caseState);
          that.$store.commit("setURL", url);
          that.$nextTick(() => that.$store.commit("setphase", 0));
        }
      });
    };
    reader.readAsText(new Blob([blob.slice(4, len + 4)]));
  });
}

fileBlob(file, cb) {
  let reader = new FileReader();
  reader.onload = function() {
    if (cb) cb(reader.result);
  };
  reader.readAsArrayBuffer(file);
}
*/
