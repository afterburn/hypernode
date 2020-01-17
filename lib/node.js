class Node {
  constructor (config) {
    this.config = config
  }

  start () {
    const { transports } = this.config
    transports.forEach(transport => {
      transport.start(this)
    })
  }
}

module.exports = Node