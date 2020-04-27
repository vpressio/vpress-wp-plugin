class VpressError extends Error {
  constructor(valueName = 'unset', ...params) {
    super(...params)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, VpressError)
    }
    this.valueName = valueName;
  }
}
module.exports = VpressError;