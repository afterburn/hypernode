[![Build Status](https://travis-ci.org/afterburn/hypernode.svg?branch=master)](https://travis-ci.org/afterburn/hypernode)
[![Downloads](https://img.shields.io/npm/dt/hypernode.svg)]()
[![MIT license](http://img.shields.io/badge/license-MIT-brightgreen.svg)](http://opensource.org/licenses/MIT)

![HyperNode logo](https://afterburn.github.io/cdn/images/hypernode.png)

**THIS IS AN UNFINISHED PROJECT**

HyperNode is an open-source Node.js framework for building both large to small scale peer-to-peer (P2P) networks. The aim is to create a framework which allows developers to easily create peer-to-peer applications using any transport they please. All the complicated stuff like NAT traversal, managing peer health, etc. are being taken care of by Hypernode. Currently only transport via UDP is supported but we aim to support TCP and WebRTC in the near future.

**Todo's**
- Implement more transports (TCP, WebRTC, WebSockets).
- Implement more mechanisms for NAT traversal (currently only UDP holepunching is supported).
- Implement E2EE mechanisms.
- Efficiently distribute data across the network using a DHT.

## Installation
```javascript
npm install --save hypernode
```

## Getting started
A Hypernode network requires at least one bootnode to function properly.

```javascript
const Hypernode = require('hypernode')

// Create a bootnode.
const keypair = {
  public: '-----BEGIN PUBLIC KEY----- ... -----END PUBLIC KEY-----',
  private: '-----BEGIN RSA PRIVATE KEY----- ... -----END RSA PRIVATE KEY-----'
}
const bootnode = new Hypernode({ port: 3000, keypair: keypair })

// Create a default node (Hypernode distinguishes between bootnodes and default nodes using the initialPeers prop)
const node = new Hypernode({ port: 3000, initialPeers: initialPeers, keypair: keypair })
```
By omitting the `keypair` property Hypernode will generate a new keypair for you.
By omitting te `initialPeers` property Hypernode will assume you're setting up a bootnode, and thus will not start gossiping.

#### Events
Each node is also an event listener which means you can do stuff like:
```javascript
const node = new Hypernode({ port: 3001 })

node.on('message', (data, peer) => {
  // Emitted whenever a message from the network is received. `peer` contains info about the message sender.
});

node.on('peer:connected', peer => {
  // Emitted whenever a new peer joins the network.
})

node.on('peer:disconnected', peer => {
  // Emitted whenever a peer disconnects from the network.
})
```

## Documentation
In development

## Contributing
In development

## License
Code released under [the MIT license](https://github.com/afterburn/hypernode/blob/master/LICENSE).

Copyright 2017 Hypernode is a trademark maintained by Tegra Development
