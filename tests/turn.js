const Node = require('../index')

const initialPeers = [{ address: '192.168.0.150', port: 3000 }]

const boot = new Node({ port: 3000, keypair: require('./identities/boot.json') })
const alice = new Node({ port: 3001, keypair: require('./identities/alice.json'), initialPeers: initialPeers })
const bob = new Node({ port: 3002, keypair: require('./identities/bob.json'), initialPeers: initialPeers })

const onPeerConnect = (peer, name) => {
  if (peer.hasOwnProperty('broker')) {
    console.log(name, 'peer connected:', peer.id, '(through relay:', peer.broker.id + ')')
  } else {
    console.log(name, 'peer connected:', peer.id)
  }
}

alice.on('peer:connect', (p) => onPeerConnect(p, 'alice'))
bob.on('peer:connect', (p) => onPeerConnect(p, 'bob'))