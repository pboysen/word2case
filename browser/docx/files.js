export {
  Files
};

var promises = require("../../lib/promises");

function Files() {
    function read(uri) {
        return promises.reject(new Error("could not open external image: '" + uri + "'\ncannot open linked files from a web browser"));
    }

    return {
        read: read
    };
}
