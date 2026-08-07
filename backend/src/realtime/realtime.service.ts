import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

export type RealtimeEvent =
  | 'meeting.created'
  | 'meeting.updated'
  | 'meeting.deleted'
  | 'ai.processing'
  | 'ai.completed'
  | 'ai.failed'
  | 'actionItem.created'
  | 'actionItem.updated'
  | 'actionItem.deleted'
  | 'actionItems.changed'
  | 'notification.created'
  | 'notification.read'
  | 'notifications.changed'
  | 'invitation.updated'
  | 'invitations.changed'
  | 'comment.created';

@Injectable()
export class RealtimeService {
  private server?: Server;

  bindServer(server: Server) {
    this.server = server;
  }

  emitToUser(userId: string | undefined, event: RealtimeEvent, payload: unknown) {
    if (!userId || !this.server) return;
    this.server.to(this.userRoom(userId)).emit(event, payload);
  }

  userRoom(userId: string) {
    return `user:${userId}`;
  }
}
