import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JoinRequestStatus, UserRole } from '@prisma/client';
import { Request } from 'express';
import { BetterAuthGuard } from '../guards/better-auth.guard';
import { CreateJoinRequestDto } from './dto/create-join-request.dto';
import { RejectJoinRequestDto } from './dto/review-join-request.dto';
import { JoinRequestsService } from './join-requests.service';

type SessionUser = { id: string; role: UserRole };

/**
 * Institutional access requests.
 *
 * Every route is authenticated and derives the acting user from the session.
 * Identity is never read from the body or query string, so a caller cannot file
 * a request as somebody else or record another administrator as the reviewer.
 */
@ApiTags('join-requests')
@Controller('join-requests')
@UseGuards(BetterAuthGuard)
export class JoinRequestsController {
  constructor(private readonly joinRequestsService: JoinRequestsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: Request,
    @Body(ValidationPipe) dto: CreateJoinRequestDto,
  ) {
    const user = req.user as SessionUser;
    return this.joinRequestsService.create(user.id, dto);
  }

  /** The signed-in user's own requests. */
  @Get('me')
  async findMine(@Req() req: Request) {
    const user = req.user as SessionUser;
    return this.joinRequestsService.findMine(user.id);
  }

  /** Whether the signed-in user already applied to this institution. */
  @Get('check/:tenantId')
  async check(@Req() req: Request, @Param('tenantId') tenantId: string) {
    const user = req.user as SessionUser;
    return this.joinRequestsService.check(user.id, tenantId);
  }

  /** Review queue for an institution's admins and librarians. */
  @Get('tenant/:tenantId')
  async findForTenant(
    @Req() req: Request,
    @Param('tenantId') tenantId: string,
    @Query('status') status?: string,
  ) {
    const user = req.user as SessionUser;
    const parsed =
      status && status !== 'all'
        ? (status.toUpperCase() as JoinRequestStatus)
        : undefined;

    return this.joinRequestsService.findForTenant(user, tenantId, parsed);
  }

  @Put(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approve(
    @Req() req: Request,
    @Param('id') id: string,
    @Body('role') role?: string,
  ) {
    const user = req.user as SessionUser;
    return this.joinRequestsService.approve(user, id, role);
  }

  @Put(':id/reject')
  @HttpCode(HttpStatus.OK)
  async reject(
    @Req() req: Request,
    @Param('id') id: string,
    @Body(ValidationPipe) dto: RejectJoinRequestDto,
  ) {
    const user = req.user as SessionUser;
    return this.joinRequestsService.reject(user, id, dto.rejectionReason);
  }

  /** Withdraw one's own pending request. */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async cancel(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as SessionUser;
    return this.joinRequestsService.cancel(user.id, id);
  }
}
