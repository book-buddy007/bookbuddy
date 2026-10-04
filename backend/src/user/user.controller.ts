import {
  Controller,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Get,
  Put,
  Delete,
} from '@nestjs/common';
import { UserService } from './user.service';
import { BetterAuthGuard } from '../guards/better-auth.guard';
import { Request } from 'express';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(BetterAuthGuard)
  @Put('complete-onboarding')
  @HttpCode(HttpStatus.OK)
  async completeOnboarding(@Req() req: Request, @Body() data: any) {
    const user = req.user as { id: string };
    return this.userService.completeOnboarding(user.id, data);
  }

  @UseGuards(BetterAuthGuard)
  @Get('profile')
  async getProfile(@Req() req: Request) {
    const user = req.user as { id: string };
    return this.userService.getProfile(user.id);
  }

  /** The caller's own institution memberships, and nothing else. */
  @UseGuards(BetterAuthGuard)
  @Get('memberships')
  async getMemberships(@Req() req: Request) {
    const user = req.user as { id: string };
    return this.userService.getMemberships(user.id);
  }

  @UseGuards(BetterAuthGuard)
  @Put('profile')
  async updateProfile(@Req() req: Request, @Body() data: any) {
    const user = req.user as { id: string };
    return this.userService.updateProfile(user.id, data);
  }

  @UseGuards(BetterAuthGuard)
  @Delete('account')
  @HttpCode(HttpStatus.OK)
  async deleteAccount(@Req() req: Request) {
    const user = req.user as { id: string };
    return this.userService.deleteAccount(user.id);
  }
}
