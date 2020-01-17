const Transport = require('./transport')

class UDP extends Transport {
  constructor (config) {
    super()
    this.config = config
  }

  start () {
    console.log('starting udp')
  }
}

module.exports = UDP