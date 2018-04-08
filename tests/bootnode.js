const Node = require('../index')
const ip = require('ip')

const port = Number(process.argv[2])
const n = new Node({ port: port })

n.on('listening', () => console.log(`node listening on ${ip.address()}:${port} as ${n.id}`))
n.on('peer:discovery', (p) => console.log('node peer discovered:', p.id))
n.on('peer:connect', (p) => console.log('node peer connected:', p.id))