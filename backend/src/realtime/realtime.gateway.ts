import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import { RealtimeService } from './realtime.service';

type JwtPayload = {
  sub?: string;
  email?: string;
  role?: string;
};

function parseOrigins(value?: string) {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

function getAllowedOrigins() {
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  const corsOrigins = process.env.CORS_ORIGINS ?? frontendUrl;
  return {
    allowAnyOrigin: corsOrigins.trim() === '*',
    origins: new Set([
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      ...parseOrigins(frontendUrl),
      ...parseOrigins(corsOrigins),
    ]),
  };
}

@WebSocketGateway({
  cors: {
    origin(origin, callback) {
      const { allowAnyOrigin, origins } = getAllowedOrigins();
      if (
        allowAnyOrigin ||
        !origin ||
        origins.has(origin.replace(/\/+$/, '')) ||
        /^https:\/\/[a-z0-9-]+\.euw\.devtunnels\.ms$/i.test(origin)
      ) {
        callback(null, true);
        return;
      }

      callback(new Error(`WebSocket CORS origin not allowed: ${origin}`));
    },
  },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly realtimeService: RealtimeService,
  ) {}

  afterInit(server: Server) {
    this.realtimeService.bindServer(server);
  }

  async handleConnection(client: Socket) {
    const token = this.readToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      if (!payload.sub) {
        client.disconnect(true);
        return;
      }

      await client.join(this.realtimeService.userRoom(payload.sub));
      client.emit('realtime.connected', { userId: payload.sub });
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() body: unknown) {
    client.emit('pong', { ok: true, echo: body ?? null });
  }

  private readToken(client: Socket): string | undefined {
    const auth = client.handshake.auth as Record<string, unknown> | undefined;
    const authToken = auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.trim();
    }

    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.toLowerCase().startsWith('bearer ')) {
      return header.slice(7).trim();
    }

    return undefined;
  }
}
