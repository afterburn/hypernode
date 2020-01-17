const { Node, TCP, UDP } = require('./lib');

const alice = new Node({
  transports: [new UDP(), new TCP()],
  port: 3000
})

alice.start()