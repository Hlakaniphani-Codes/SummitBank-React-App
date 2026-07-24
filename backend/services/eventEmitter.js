// Real-time event emitter for broadcasting changes to connected clients
// Uses Socket.IO to push events to relevant users and admins

let io = null;

// Map userId -> Set<socketId> for tracking user connections
const userSockets = new Map();
// Map socketId -> { userId, role, type }
const socketUsers = new Map();
// Set of admin socket IDs
const adminSockets = new Set();

function setIO(socketIO) {
  io = socketIO;
}

/**
 * Initialize Socket.IO event handlers
 * @param {object} socket - The connected socket
 */
function initSocket(socket) {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // Client sends auth token to identify themselves
  socket.on('authenticate', (data) => {
    const { userId, role } = data || {};
    if (userId) {
      // Track user sockets
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId).add(socket.id);
      
      // Track socket user
      socketUsers.set(socket.id, { userId, role: role || 'user', socket });
      
      // Track admin sockets
      if (role === 'admin') {
        adminSockets.add(socket.id);
      }
      
      console.log(`🔐 Socket ${socket.id} authenticated as user ${userId} (${role || 'user'})`);
      
      // Confirm authentication
      socket.emit('authenticated', { success: true, userId, role });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
    const userData = socketUsers.get(socket.id);
    if (userData) {
      const { userId, role } = userData;
      // Remove from user sockets
      if (userSockets.has(userId)) {
        userSockets.get(userId).delete(socket.id);
        if (userSockets.get(userId).size === 0) {
          userSockets.delete(userId);
        }
      }
      // Remove from admin sockets
      if (role === 'admin') {
        adminSockets.delete(socket.id);
      }
      socketUsers.delete(socket.id);
    }
  });
}

/**
 * Emit an event to a specific user
 */
function emitToUser(userId, event, data) {
  if (!io) return;
  const sockets = userSockets.get(userId);
  if (sockets) {
    sockets.forEach(socketId => {
      io.to(socketId).emit(event, data);
    });
    console.log(`📤 Emitted "${event}" to user ${userId}`);
  }
}

/**
 * Emit an event to all admin sockets
 */
function emitToAdmins(event, data) {
  if (!io) return;
  adminSockets.forEach(socketId => {
    io.to(socketId).emit(event, data);
  });
  console.log(`📤 Emitted "${event}" to all admins`);
}

/**
 * Emit an event to all connected clients
 */
function emitToAll(event, data) {
  if (!io) return;
  io.emit(event, data);
  console.log(`📤 Emitted "${event}" to all clients`);
}

/**
 * Emit a notification event to a user (also sends to admins if it's a user action)
 */
function emitNotification(userId, notification, isAdminAction = false) {
  // Send to the target user
  emitToUser(userId, 'new-notification', notification);
  
  // If it's a user action (not admin action), notify admins too
  if (!isAdminAction) {
    emitToAdmins('admin-notification', {
      ...notification,
      targetUserId: userId
    });
  }
}

/**
 * Emit a balance update event to a user
 */
function emitBalanceUpdate(userId, accounts) {
  emitToUser(userId, 'balance-update', { accounts });
}

/**
 * Emit a transaction event to a user
 */
function emitTransaction(userId, transaction) {
  emitToUser(userId, 'new-transaction', transaction);
  emitToAdmins('admin-transaction', {
    ...transaction,
    targetUserId: userId
  });
}

module.exports = {
  setIO,
  initSocket,
  emitToUser,
  emitToAdmins,
  emitToAll,
  emitNotification,
  emitBalanceUpdate,
  emitTransaction,
  userSockets,
  adminSockets,
};
