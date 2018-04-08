class Queue {
  constructor (conditional, callback) {
    this.conditional = conditional
    this.callback = callback
    this.queue = []

    setInterval(() => {
      if (this.conditional() === true && this.queue.length > 0) {
        this.dequeue()
      }
    })
  }

  enqueue (message) {
    this.queue.push(message)
  }

  dequeue () {
    const message = this.queue.shift()
    this.callback(message)
  }
}

module.exports = Queue