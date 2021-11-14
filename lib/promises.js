export {
  defer,
  when,
  resolve,
  all,
  props,
  reject,
  promisify,
  mapSeries,
  attempt,
  nfcall
};

var _ = require("underscore");
var bluebird = require("bluebird/js/release/promise")();

var when = bluebird.resolve;
var resolve = bluebird.resolve;
var all = bluebird.all;
var props = bluebird.props;
var reject = bluebird.reject;
var promisify = bluebird.promisify;
var mapSeries = bluebird.mapSeries;
var attempt = bluebird.attempt;

var nfcall = function(func) {
    var args = Array.prototype.slice.call(arguments, 1);
    var promisedFunc = bluebird.promisify(func);
    return promisedFunc.apply(null, args);
};

bluebird.prototype.fail = bluebird.prototype.caught;

bluebird.prototype.also = function(func) {
    return this.then(function(value) {
        var returnValue = _.extend({}, value, func(value));
        return bluebird.props(returnValue);
    });
};

function defer() {
    var resolve;
    var reject;
    var promise = new bluebird.Promise(function(resolveArg, rejectArg) {
        resolve = resolveArg;
        reject = rejectArg;
    });

    return {
        resolve: resolve,
        reject: reject,
        promise: promise
    };
}
