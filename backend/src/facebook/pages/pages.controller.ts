import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GetUser, AuthUser } from '../../auth/decorators/get-user.decorator';
import { ManagedFacebookPage, PagesService } from './pages.service';

@ApiTags('facebook/pages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('facebook/pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get()
  @ApiOperation({ summary: 'Get managed Facebook pages for current user' })
  @ApiResponse({ status: 200, description: 'Returns managed Facebook pages' })
  getPages(@GetUser() user: AuthUser): Promise<ManagedFacebookPage[]> {
    return this.pagesService.getManagedPages(user.id);
  }
}
