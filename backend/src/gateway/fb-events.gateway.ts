import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';

export interface CommentRepliedPayload {
  commentId: string;
  pageId: string;
  reply: {
    replyId: string;
    author: {
      id: string;
      name: string;
    };
    message: string;
    createdTime: string;
  };
}

@WebSocketGateway({
  cors: {
    origin: (_origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      callback(null, true);
    },
    credentials: true,
  },
})
export class FbEventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(FbEventsGateway.name);

  constructor(private readonly configService: ConfigService<AppConfig>) {}

  afterInit(server: Server): void {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    server.engine.on('headers', () => {});
    this.logger.log('WebSocket gateway initialized. Allowed origin: ' + frontendUrl);
  }

  handleConnection(client: Socket): void {
    this.logger.log('Client connected: ' + client.id);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log('Client disconnected: ' + client.id);
  }

  emitNewComment(payload: {
    pageId: string;
    postId: string;
    commentId: string;
    author: {
      id: string;
      name: string;
      avatar?: string;
    };
    message: string;
    attachment?: {
      type?: string;
      imageUrl?: string;
      url?: string;
      title?: string;
      description?: string;
    };
    createdTime: string;
  }): void {
    this.logger.log('Emitting comment:new for post ' + payload.postId);
    this.server.emit('comment:new', payload);
  }

  emitCommentRead(payload: { postId: string; commentId: string }): void {
    this.logger.log('Emitting comment:read for comment ' + payload.commentId);
    this.server.emit('comment:read', payload);
  }

  emitCommentReplied(payload: CommentRepliedPayload): void {
    this.logger.log('Emitting comment:replied for comment ' + payload.commentId);
    this.server.emit('comment:replied', payload);
  }
}
