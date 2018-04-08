const Node = require('../index')

// const initialPeers = [{ address: '81.169.214.31', port: 3000 }]
const initialPeers = [{ address: '192.168.0.150', port: 3000 }]

const boot = new Node({ port: 3000, keypair: require('./identities/boot.json') })
const alice = new Node({ port: 3001, keypair: require('./identities/alice.json'), initialPeers: initialPeers })
const bob = new Node({ port: 3002, keypair: require('./identities/bob.json'), initialPeers: initialPeers })

boot.on('message', (msg, p) => console.log(`boot got message '${msg.message}' (${msg.timestamp}) from ${p.id}`))
bob.on('message', (msg, p) => console.log(`bob got message '${msg.message}' (${msg.timestamp}) from ${p.id}`))
alice.relay({ message: 'hello world', timestamp: new Date() })