import { WebSocketServer } from 'ws';

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // Map of client connections with their subscriptions
  }

  /**
   * Initialize WebSocket server attached to HTTP server
   * @param {Object} server - HTTP server instance
   */
  init(server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      this.clients.set(clientId, { ws, subscriptions: new Set() });
      
      console.log(`Client connected: ${clientId}`);
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connection',
        status: 'connected',
        clientId,
        timestamp: new Date().toISOString()
      }));

      ws.on('message', (data) => this.handleMessage(clientId, data));
      
      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`Client disconnected: ${clientId}`);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
      });
    });

    console.log('WebSocket server initialized on /ws');
  }

  /**
   * Handle incoming WebSocket messages
   * @param {string} clientId - Client identifier
   * @param {Buffer} data - Raw message data
   */
  handleMessage(clientId, data) {
    try {
      const message = JSON.parse(data.toString());
      const client = this.clients.get(clientId);

      switch (message.type) {
        case 'subscribe':
          // Subscribe to event channels (incidents, alerts, resources)
          if (message.channels) {
            message.channels.forEach(ch => client.subscriptions.add(ch));
          }
          break;

        case 'unsubscribe':
          if (message.channels) {
            message.channels.forEach(ch => client.subscriptions.delete(ch));
          }
          break;

        case 'ping':
          client.ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;

        default:
          console.log(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  /**
   * Broadcast message to all clients subscribed to a channel
   * @param {string} channel - Channel name
   * @param {Object} data - Data to broadcast
   */
  broadcast(channel, data) {
    const message = JSON.stringify({
      type: 'broadcast',
      channel,
      data,
      timestamp: new Date().toISOString()
    });

    this.clients.forEach((client) => {
      if (client.subscriptions.has(channel) && client.ws.readyState === 1) {
        client.ws.send(message);
      }
    });
  }

  /**
   * Broadcast to all connected clients regardless of subscription
   * @param {Object} data - Data to broadcast
   */
  broadcastAll(data) {
    const message = JSON.stringify({
      type: 'broadcast',
      channel: 'all',
      data,
      timestamp: new Date().toISOString()
    });

    this.clients.forEach((client) => {
      if (client.ws.readyState === 1) {
        client.ws.send(message);
      }
    });
  }

  /**
   * Send real-time incident update
   * @param {Object} incident - Incident data
   */
  sendIncidentUpdate(incident) {
    this.broadcast('incidents', {
      action: 'update',
      incident
    });
  }

  /**
   * Send real-time alert
   * @param {Object} alert - Alert data
   */
  sendAlert(alert) {
    this.broadcast('alerts', {
      action: 'new',
      alert
    });
  }

  /**
   * Send resource allocation update
   * @param {Object} resource - Resource data
   */
  sendResourceUpdate(resource) {
    this.broadcast('resources', {
      action: 'update',
      resource
    });
  }

  /**
   * Generate unique client ID
   * @returns {string} - Unique identifier
   */
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get connected client count
   * @returns {number}
   */
  getClientCount() {
    return this.clients.size;
  }
}

export const wsService = new WebSocketService();
export default wsService;
