import { ApiProperty } from '@nestjs/swagger';

class InboxCommentAuthorDto {
  @ApiProperty({ example: '1234567890' })
  id!: string;

  @ApiProperty({ example: 'Jane Doe' })
  name!: string;

  @ApiProperty({ required: false, nullable: true })
  avatar?: string;
}

class InboxCommentPageDto {
  @ApiProperty({ example: '112233445566' })
  id!: string;

  @ApiProperty({ example: 'My Fanpage' })
  name!: string;

  @ApiProperty({ required: false, nullable: true })
  logo?: string;
}

class InboxCommentPostDto {
  @ApiProperty({ example: '112233445566_998877665544' })
  id!: string;

  @ApiProperty({ example: 'Post content preview' })
  content!: string;

  @ApiProperty({ required: false, nullable: true })
  permalink?: string;

  @ApiProperty({ required: false, nullable: true })
  picture?: string;
}

class InboxCommentAttachmentDto {
  @ApiProperty({ required: false, nullable: true })
  type?: string;

  @ApiProperty({ required: false, nullable: true })
  imageUrl?: string;

  @ApiProperty({ required: false, nullable: true })
  url?: string;

  @ApiProperty({ required: false, nullable: true })
  title?: string;

  @ApiProperty({ required: false, nullable: true })
  description?: string;
}

export class InboxCommentReplyDto {
  @ApiProperty({ example: '9988776655443322_1234567890' })
  replyId!: string;

  @ApiProperty({ type: InboxCommentAuthorDto })
  author!: InboxCommentAuthorDto;

  @ApiProperty({ example: 'This is a reply message.' })
  message!: string;

  @ApiProperty({ example: '2026-04-21T08:20:30.000Z' })
  createdTime!: string;
}

export class InboxCommentDto {
  @ApiProperty({ example: '9988776655443322' })
  commentId!: string;

  @ApiProperty({ example: '112233445566' })
  pageId!: string;

  @ApiProperty({ example: '112233445566_998877665544' })
  postId!: string;

  @ApiProperty({ type: InboxCommentAuthorDto })
  author!: InboxCommentAuthorDto;

  @ApiProperty({ type: InboxCommentPageDto })
  page!: InboxCommentPageDto;

  @ApiProperty({ type: InboxCommentPostDto })
  post!: InboxCommentPostDto;

  @ApiProperty({ example: 'This is a comment from Facebook user.' })
  message!: string;

  @ApiProperty({ type: InboxCommentAttachmentDto, required: false, nullable: true })
  attachment?: InboxCommentAttachmentDto;

  @ApiProperty({ example: '2026-04-21T08:15:30.000Z' })
  createdTime!: string;

  @ApiProperty({ example: false })
  isRead!: boolean;

  @ApiProperty({ required: false, nullable: true })
  readAt?: string | null;

  @ApiProperty({ type: [InboxCommentReplyDto], example: [] })
  replies!: InboxCommentReplyDto[];
}
