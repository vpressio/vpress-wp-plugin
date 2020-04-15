class VpressError extends Error {
  constructor(value = '', ...params) {
    super(...params)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, VpressError)
    }

    this.value = value;
  }
}
module.exports = VpressError;