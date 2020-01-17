const Transport = require('./transport')

class TCP extends Transport {
  constructor (config) {
    super()
    this.config = config
  }
}

module.exports = TCP