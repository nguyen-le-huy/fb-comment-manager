import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface FacebookPageInfo {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  picture?: {
    data?: {
      url?: string;
    };
  };
}

export interface FbPost {
  id: string;
  message?: string;
  story?: string;
  permalink_url?: string;
  full_picture?: string;
  created_time: string;
  comments?: { summary: { total_count: number } };
}

export interface FbPostsResponse {
  data: FbPost[];
  paging?: {
    cursors?: { before: string; after: string };
    next?: string;
    previous?: string;
  };
}

export interface FbComment {
  id: string;
  from?: {
    id: string;
    name: string;
    picture?: {
      data?: {
        url?: string;
      };
    };
  };
  message?: string;
  created_time: string;
  attachment?: {
    type?: string;
    url?: string;
    title?: string;
    description?: string;
    target?: {
      url?: string;
    };
    media?: {
      image?: {
        src?: string;
      };
    };
  };
  comments?: { data: FbComment[] };
}

export interface FbCommentsResponse {
  data: FbComment[];
  paging?: {
    cursors?: { before: string; after: string };
    next?: string;
  };
}

export interface FbSubscribedApp {
  id: string;
  name?: string;
}

const GRAPH_API_BASE_URL = 'https://graph.facebook.com';
const GRAPH_API_VERSION = 'v21.0';

@Injectable()
export class GraphApiService {
  private readonly logger = new Logger(GraphApiService.name);
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: GRAPH_API_BASE_URL + '/' + GRAPH_API_VERSION,
      timeout: 30_000, // 30s — tránh treo request vô thời hạn
    });
  }

  async getManagedPages(userAccessToken: string): Promise<FacebookPageInfo[]> {
    this.logger.log('Fetching managed pages');
    try {
      const response = await this.http.get<{ data: FacebookPageInfo[] }>('/me/accounts', {
        params: {
          access_token: userAccessToken,
          fields: 'id,name,access_token,category,picture{url}',
        },
      });
      return response.data.data;
    } catch (error) {
      this.logger.error('Failed to fetch managed pages', (error as Error).stack);
      throw new InternalServerErrorException('Could not fetch managed pages from Facebook');
    }
  }

  async getPagePosts(
    pageId: string,
    pageAccessToken: string,
    limit = 10,
    after?: string,
  ): Promise<FbPostsResponse> {
    this.logger.log('Fetching posts', { pageId, limit });
    try {
      const params: Record<string, string | number> = {
        access_token: pageAccessToken,
        fields: 'id,message,story,permalink_url,full_picture,created_time,comments.summary(true)',
        limit,
      };
      if (after) params['after'] = after;

      const response = await this.http.get<FbPostsResponse>('/' + pageId + '/posts', { params });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch posts', (error as Error).stack);
      throw new InternalServerErrorException('Could not fetch posts from Facebook');
    }
  }

  async getPostComments(
    postId: string,
    pageAccessToken: string,
    limit = 25,
    after?: string,
  ): Promise<FbCommentsResponse> {
    this.logger.log('Fetching comments', { postId, limit });
    try {
      const params: Record<string, string | number> = {
        access_token: pageAccessToken,
        fields:
          'id,from{id,name,picture{url}},message,created_time,attachment{type,url,title,description,target,media},comments{id,from{id,name,picture{url}},message,created_time,attachment{type,url,title,description,target,media}}',
        limit,
      };
      if (after) params['after'] = after;

      const response = await this.http.get<FbCommentsResponse>('/' + postId + '/comments', {
        params,
      });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch comments', (error as Error).stack);
      throw new InternalServerErrorException('Could not fetch comments from Facebook');
    }
  }

  async replyToComment(
    commentId: string,
    message: string,
    pageAccessToken: string,
  ): Promise<{ id: string }> {
    this.logger.log('Replying to comment', { commentId });
    try {
      const response = await this.http.post<{ id: string }>(
        '/' + commentId + '/comments',
        { message },
        { params: { access_token: pageAccessToken } },
      );
      return response.data;
    } catch (error) {
      this.logger.error('Failed to reply to comment', (error as Error).stack);
      throw new InternalServerErrorException('Could not post reply to Facebook');
    }
  }

  async getCommentById(
    commentId: string,
    pageAccessToken: string,
  ): Promise<FbComment> {
    this.logger.log('Fetching single comment', { commentId });
    try {
      const response = await this.http.get<FbComment>('/' + commentId, {
        params: {
          access_token: pageAccessToken,
          fields: 'id,from{id,name,picture{url}},message,created_time,attachment{type,url,title,description,target,media}',
        },
      });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch comment', (error as Error).stack);
      throw new InternalServerErrorException('Could not fetch comment from Facebook');
    }
  }

  async subscribeAppToPage(pageId: string, pageAccessToken: string): Promise<boolean> {
    this.logger.log('Subscribing app to page webhooks', { pageId });
    try {
      const response = await this.http.post<{ success: boolean }>(
        '/' + pageId + '/subscribed_apps',
        null,
        {
          params: {
            access_token: pageAccessToken,
            subscribed_fields: 'feed',
          },
        },
      );
      return response.data.success;
    } catch (error) {
      const responseData = axios.isAxiosError(error)
        ? JSON.stringify(error.response?.data ?? {})
        : '{}';
      this.logger.error(
        `Failed to subscribe app to page ${pageId}. Response: ${responseData}`,
        (error as Error).stack,
      );
      return false; // Don't throw to prevent login failure if this fails
    }
  }

  async getSubscribedApps(
    pageId: string,
    pageAccessToken: string,
  ): Promise<FbSubscribedApp[]> {
    this.logger.log('Checking subscribed apps for page', { pageId });
    try {
      const response = await this.http.get<{ data: FbSubscribedApp[] }>(
        '/' + pageId + '/subscribed_apps',
        {
          params: {
            access_token: pageAccessToken,
          },
        },
      );

      return response.data.data ?? [];
    } catch (error) {
      const responseData = axios.isAxiosError(error)
        ? JSON.stringify(error.response?.data ?? {})
        : '{}';
      this.logger.error(
        `Failed to check subscribed apps for page ${pageId}. Response: ${responseData}`,
        (error as Error).stack,
      );
      return [];
    }
  }
}
