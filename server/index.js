const Server = require('./server');
const server = new Server()
server.listen(process.env.PORT || 5000)