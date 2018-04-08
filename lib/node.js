const EventEmitter = require('events').EventEmitter
const dgram = require('dgram')
const keypair = require('keypair')
const crypto = require('crypto')
const ip = require('ip')
const Queue = require('./queue')
const packets = require('./packets')

class Node extends EventEmitter {
  constructor (config) {
    super(config)
    this.config = config
    this.initialPeers = config.initialPeers
    this.config.address = config.address || ip.address()
    this.keypair = config.keypair || keypair()
    this.id = this.generateId(this.keypair.public, this.keypair.private)
    this.initialize()
    this.start()
  }

  initialize () {
    this.bootnodes = {}
    this.peerlist = {}
    this.messageQueue = new Queue(() => (this.getAlivePeerCount() > 0), (msg) => this.relaySend(msg))
    this.messages = {}
    this.heartbeats = {}
  }

  generateId (pubKey, privKey) {
    return '0x' + crypto.createHmac('sha256', privKey).update(pubKey).digest('hex').substring(0, 40)
  }

  generateMessageId(input, pubKey, privKey) {
    return '0x' + crypto.createHmac('sha256', privKey).update(input + pubKey).digest('hex').substring(0, 40)
  }

  generateGuid (reference, callback) {
    const rnd = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)
    const guid = rnd() + rnd() + '-' + rnd() + '-' + rnd() + '-' + rnd() + '-' + rnd() + rnd() + rnd()
    if (!reference.hasOwnProperty(guid)) {
      callback(guid)
    } else {
      this.generateGuid(reference, callback)
    }
  }

  start () {
    this.socket = dgram.createSocket('udp4')
    this.socket.on('message', (a, b) => this.onmessage(a, b))
    this.socket.on('error', (a) => this.onerror(a))
    this.socket.on('listening', () => this.onlistening())
    this.socket.bind(this.config.port, this.config.address)
  }

  stop () {
    this.socket.close()
  }

  createPacket () {
    return Array.from(arguments).join('|')
  }

  parsePacket (packet) {
    return packet.split('|')
  }

  send (packet, endpoint) {
    this.socket.send(packet.toString(), endpoint.port, endpoint.address, (err) => {
      if (err) console.log(err)
    })
  }

  createPeer (id, endpoint) {
    return { id, endpoint, alive: false }
  }

  formatPeer (peer) {
    return { id: peer.id, endpoint: { address: peer.endpoint.address, port: peer.endpoint.port }}
  }

  registerPeer (peer) {
    if (!this.peerlist.hasOwnProperty(peer.id)) {
      this.peerlist[peer.id] = peer
      this.emit('peer:discovery', peer)
      return true
    }
    return false
  }

  setPeerAlive (id, alive) {
    if (this.peerlist.hasOwnProperty(id)) {
      this.peerlist[id].alive = alive
      if (alive === true) {
        this.emit('peer:connect', this.peerlist[id])
      } else {
        this.emit('peer:disconnect', this.peerlist[id])
      }
    }
  }
  
  setBootnodeAlive (id, alive) {
    if (this.bootnodes.hasOwnProperty(id)) {
      this.bootnodes[id].alive = alive
    }
  }

  stringifyPeerlist (excluded = []) {
    return JSON.stringify(Object.keys(this.peerlist).map(id => {
      const peer = this.peerlist[id]
      return { id: peer.id, endpoint: { address: peer.endpoint.address, port: peer.endpoint.port } }
    }).filter(i => excluded.indexOf(i.id) === -1))
  }

  parsePeerlist (peerlist) {
    return JSON.parse(peerlist).map(peerData => this.createPeer(peerData.id, peerData.endpoint))
  }

  onmessage (packet, sender) {
    const data = packet.toString().split('|')
    const opcode = Number(data.shift())
    switch (opcode) {
      case packets.register: {
        this.onRegister(data, sender)
        break
      }
      case packets.ack_register: {
        this.onRegisterAcknowledged(data, sender)
        break
      }
      case packets.confirm_register: {
        this.onRegisterConfirmed(data, sender)
        break
      }
      case packets.peerlist: {
        this.onPeerlist(data, sender)
        break
      }
      case packets.ack_peerlist: {
        this.onPeerlistAcknowledged(data, sender)
        break
      }
      case packets.new_peer: {
        this.onNewPeer(data, sender)
        break
      }
      case packets.message: {
        this.onMessage(packet, data, sender)
        break
      }
      case packets.ping: {
        this.onPing(data, sender)
        break
      }
      case packets.pong: {
        this.onPong(data, sender)
        break
      }
    }
  }

  onerror (err) {
    console.log(err)
  }

  onlistening () {
    console.log(`node listening on ${this.config.address}:${this.config.port} as ${this.id}`)
    if (this.config.initialPeers) {
      this.initialPeers.forEach((endpoint) => {
        this.generateGuid(this.bootnodes, (bootnodeId) => {
          this.bootnodes[bootnodeId] = { endpoint, alive: false }
          this.send(this.createPacket(packets.register, this.id, bootnodeId), endpoint)
        })
      })
    }
    this.emit('listening')
  }

  notifyPeers (packet, excluded) {
    Object.keys(this.peerlist).forEach(id => {
      const peer = this.peerlist[id]
      if (excluded.indexOf(peer.id) === -1) {
        this.send(packet, peer.endpoint)
      }
    })
  }

  onRegister (data, sender) {
    const peer = this.createPeer(data[0], sender)
    const hasBootnodeIdentifier = data.length > 1

    if(this.registerPeer(peer)) {
      if (hasBootnodeIdentifier) {
        this.send(this.createPacket(packets.ack_register, this.id, data[1]), peer.endpoint)
      } else {
        this.send(this.createPacket(packets.ack_register, this.id), peer.endpoint)
      }
      this.notifyPeers(this.createPacket(packets.new_peer, JSON.stringify(this.formatPeer(peer))), [this.id, peer.id])
    } else {
      // Peer already exists in peerlist
      if (!hasBootnodeIdentifier) {
        this.send(this.createPacket(packets.ack_register, this.id), peer.endpoint)
      }
    }
  }

  onRegisterAcknowledged (data, sender) {
    const hasBootnodeIdentifier = data.length > 1
    if (hasBootnodeIdentifier) {
      this.setBootnodeAlive(data[1])
    }
    
    const peer = this.createPeer(data[0], sender)
    this.registerPeer(peer)
    // TODO: Maybe differentiate between already registered and new peers here.
    this.setPeerAlive(peer.id, true)
    this.send(this.createPacket(packets.confirm_register, this.id), peer.endpoint)
    this.send(this.createPacket(packets.peerlist, this.id), peer.endpoint)
    this.startHeartbeat(peer.id, sender)
  }

  onRegisterConfirmed (data, sender) {
    const peer = this.createPeer(data[0], sender)
    this.setPeerAlive(peer.id, true)
    this.startHeartbeat(peer.id, sender)
  }

  onPeerlist (data, sender) {
    const peer = this.createPeer(data[0], sender)
    const peerlist = this.stringifyPeerlist([peer.id, this.id])
    this.send(this.createPacket(packets.ack_peerlist, peerlist), peer.endpoint)
  }

  onPeerlistAcknowledged (data, sender) {
    const peerlist = this.parsePeerlist(data)
    peerlist.forEach(peer => {
      if(this.registerPeer(peer)) {
        this.send(this.createPacket(packets.register, this.id), peer.endpoint)
      } else {
        // Peer already exists in peerlist
      }
    })
  }

  onNewPeer (data, sender) {
    const peerData = JSON.parse(data[0])
    const peer = this.createPeer(peerData.id, peerData.endpoint)
    if (this.registerPeer(peer)) {
      this.send(this.createPacket(packets.register, this.id), peer.endpoint)
    } else {
      // Peer already exists in peerlist
    }
  }

  getAlivePeerCount () {
    let count = 0
    Object.keys(this.peerlist).forEach((id) => {
      const peer = this.peerlist[id]
      if (peer.alive) count++
    })
    return count
  }

  getPeerCount () {
    return Object.keys(this.peerlist).length
  }

  relay (data) {
    const messageId = this.generateMessageId(JSON.stringify(data), this.keypair.public, this.keypair.private)
    const message = JSON.stringify(data)
    const packet = this.createPacket(packets.message, this.id, messageId, message)
    this.messageQueue.enqueue(packet)
  }
  
  relaySend (packet) {
    Object.keys(this.peerlist).forEach((id) => {
      const peer = this.peerlist[id]
      this.send(packet, peer.endpoint)
    })    
  }

  onMessage (packet, data, sender) {
    const message = { sender: data[0], id: data[1], data: JSON.parse(data[2]) }
    if (!this.messages.hasOwnProperty(message.id) && this.peerlist.hasOwnProperty(data[0])) {
      const peer = this.peerlist[data[0]]
      this.messages[message.id] = message
      this.emit('message', message.data, this.formatPeer(peer))
      this.messageQueue.enqueue(packet)
    }
  }

  startHeartbeat(id, endpoint) {
    if (!this.heartbeats.hasOwnProperty(id)) {
      this.sendHeartbeat(id, endpoint)
    }
  }

  sendHeartbeat (id, endpoint) {
    this.send(this.createPacket(packets.ping, id), endpoint)
    const heartbeat = { start: new Date(), ponger: id }
    setTimeout(() => {
      const elapsed = heartbeat.end - heartbeat.start
      if (isNaN(elapsed) || elapsed < 0) {
        this.markPeerAsDead(heartbeat.ponger)
        // TODO: Implement reconnect mechanism
      } else {
        this.sendHeartbeat(id, endpoint)
      }
    }, 3000)
    this.heartbeats[id] = heartbeat
  }

  onPing (data, sender) {
    this.send(this.createPacket(packets.pong, data[0]), sender)
  }

  onPong (data, sender) {
    const heartbeat = this.heartbeats[data[0]]
    heartbeat.end = new Date()
  }

  markPeerAsDead (id) {
    if(this.peerlist.hasOwnProperty(id)) {
      this.setPeerAlive(id, false)
    }
  }
}

module.exports = Node