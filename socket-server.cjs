const { Server } = require("socket.io");
const http = require("http");

// Servidor WebSocket Minimalista para o TicketFlow
const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "*", // Permite conexões de qualquer origem (Ajuste para seu domínio em produção)
    methods: ["GET", "POST"]
  },
});

io.on("connection", (socket) => {
  console.log("LOG: Novo usuário conectado ao WebSocket:", socket.id);
  
  // Quando um ticket é criado, avisamos a todos os outros conectados
  socket.on("ticket_created", (data) => {
    console.log("LOG: Novo ticket detectado! Avisando equipe...");
    socket.broadcast.emit("new_ticket_alert", data);
  });

  // Quando um status muda
  socket.on("status_updated", (data) => {
    socket.broadcast.emit("ticket_status_refreshed", data);
  });

  socket.on("disconnect", () => {
    console.log("LOG: Usuário desconectado.");
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\x1b[32m%s\x1b[0m`, `>>> WebSocket Server rodando na porta ${PORT}`);
  console.log(`>>> Pronto para enviar notificações em tempo real.`);
});
