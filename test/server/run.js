const Server = require('./');

const PORT = 8080;

Server.run(PORT)
  .then(() => void console.log(`Server is running on http://localhost:${PORT}/`));
