import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { Role, type Company, type User } from '@prisma/client';
import { AuthService, type PublicUser } from './auth';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard, Roles, RolesGuard } from './guards';
import { apiError } from './http';
import { PrismaService } from './prisma.service';
import { notificationJson } from './present';
import { ProviderService } from './provider.service';

type AccountRequest = { user: User & { company: Company | null } };

@Controller()
export class ApiController {
  constructor(
    private readonly auth: AuthService,
    private readonly bookings: BookingsService,
    private readonly provider: ProviderService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('health')
  health() {
    return { ok: true };
  }

  @Get('catalog')
  catalog() {
    return this.bookings.catalog();
  }

  @Get('trips')
  trips(@Query('from') from?: string, @Query('to') to?: string, @Query('date') date?: string) {
    return this.bookings.search(from ?? '', to ?? '', date ?? '');
  }

  @Get('trips/:id')
  trip(@Param('id') id: string) {
    return this.bookings.trip(id);
  }

  @Post('auth/register')
  register(@Body() body: Record<string, string>) {
    return this.auth.register(body);
  }

  @Post('auth/login')
  login(@Body() body: { username?: string; password?: string }) {
    return this.auth.login(body.username, body.password);
  }

  @Get('auth/me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: AccountRequest): PublicUser {
    return this.authShape(req);
  }

  @Get('bookings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.customer)
  myBookings(@Req() req: AccountRequest) {
    return this.bookings.listForUser(req.user.id);
  }

  @Post('bookings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.customer)
  createBooking(@Req() req: AccountRequest, @Body() body: Parameters<BookingsService['create']>[2]) {
    return this.bookings.create(req.user.id, req.user.role, body);
  }

  @Get('bookings/:reference')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.customer)
  booking(@Req() req: AccountRequest, @Param('reference') reference: string) {
    return this.bookings.oneForUser(req.user.id, reference);
  }

  @Post('bookings/:reference/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.customer)
  cancel(@Req() req: AccountRequest, @Param('reference') reference: string) {
    return this.bookings.cancel(req.user.id, reference);
  }

  @Get('notifications')
  @UseGuards(JwtAuthGuard)
  async notifications(@Req() req: AccountRequest) {
    const rows = await this.prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return {
      unread: rows.filter((row) => !row.readAt).length,
      items: rows.map(notificationJson),
    };
  }

  @Post('notifications/read-all')
  @UseGuards(JwtAuthGuard)
  async readAll(@Req() req: AccountRequest) {
    await this.prisma.notification.updateMany({
      where: { userId: req.user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  @Post('notifications/:id/read')
  @UseGuards(JwtAuthGuard)
  async readOne(@Req() req: AccountRequest, @Param('id') id: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId: req.user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  @Get('provider/dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.provider)
  dashboard(@Req() req: AccountRequest) {
    return this.provider.dashboard(this.company(req));
  }

  @Patch('provider/company')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.provider)
  updateCompany(@Req() req: AccountRequest, @Body() body: { nameAr?: string; nameEn?: string; phone?: string }) {
    return this.provider.updateCompany(this.company(req), body);
  }

  @Get('provider/buses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.provider)
  buses(@Req() req: AccountRequest) {
    return this.provider.buses(this.company(req));
  }

  @Post('provider/buses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.provider)
  createBus(
    @Req() req: AccountRequest,
    @Body() body: { name?: string; code?: string; amenities?: string[]; standard?: boolean },
  ) {
    return this.provider.createBus(this.company(req), body);
  }

  @Get('provider/buses/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.provider)
  bus(@Req() req: AccountRequest, @Param('id') id: string) {
    return this.provider.bus(this.company(req), id);
  }

  @Patch('provider/buses/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.provider)
  updateBus(
    @Req() req: AccountRequest,
    @Param('id') id: string,
    @Body() body: { name?: string; code?: string; amenities?: string[]; active?: boolean },
  ) {
    return this.provider.updateBus(this.company(req), id, body);
  }

  @Delete('provider/buses/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.provider)
  deleteBus(@Req() req: AccountRequest, @Param('id') id: string) {
    return this.provider.deleteBus(this.company(req), id);
  }

  @Post('provider/buses/:id/seats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.provider)
  addSeat(
    @Req() req: AccountRequest,
    @Param('id') id: string,
    @Body() body: { row?: number; column?: string; classId?: string },
  ) {
    return this.provider.addSeat(this.company(req), id, body);
  }

  @Delete('provider/buses/:id/seats/:seatId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.provider)
  deleteSeat(@Req() req: AccountRequest, @Param('id') id: string, @Param('seatId') seatId: string) {
    return this.provider.deleteSeat(this.company(req), id, seatId);
  }

  @Post('provider/buses/:id/layout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.provider)
  layout(@Req() req: AccountRequest, @Param('id') id: string) {
    return this.provider.applyLayout(this.company(req), id);
  }

  @Get('provider/routes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.provider)
  routes(@Req() req: AccountRequest) {
    return this.provider.routes(this.company(req));
  }

  @Post('provider/routes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.provider)
  createRoute(@Req() req: AccountRequest, @Body() body: Parameters<ProviderService['createRoute']>[1]) {
    return this.provider.createRoute(this.company(req), body);
  }

  @Patch('provider/routes/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.provider)
  updateRoute(
    @Req() req: AccountRequest,
    @Param('id') id: string,
    @Body() body: Parameters<ProviderService['updateRoute']>[2],
  ) {
    return this.provider.updateRoute(this.company(req), id, body);
  }

  @Delete('provider/routes/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.provider)
  deleteRoute(@Req() req: AccountRequest, @Param('id') id: string) {
    return this.provider.deleteRoute(this.company(req), id);
  }

  @Get('provider/trips')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.provider)
  providerTrips(@Req() req: AccountRequest) {
    return this.provider.trips(this.company(req));
  }

  @Post('provider/trips')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.provider)
  createTrip(
    @Req() req: AccountRequest,
    @Body() body: { routeId?: string; busId?: string; departAt?: string },
  ) {
    return this.provider.createTrip(this.company(req), body);
  }

  @Get('provider/trips/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.provider)
  providerTrip(@Req() req: AccountRequest, @Param('id') id: string) {
    return this.provider.trip(this.company(req), id);
  }

  @Patch('provider/trips/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.provider)
  setStatus(@Req() req: AccountRequest, @Param('id') id: string, @Body() body: { status?: string }) {
    return this.provider.setStatus(this.company(req), id, body.status);
  }

  @Patch('provider/trips/:id/seats/:seatId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.provider)
  updateSeat(
    @Req() req: AccountRequest,
    @Param('id') id: string,
    @Param('seatId') seatId: string,
    @Body() body: { price?: number; status?: string },
  ) {
    return this.provider.updateSeat(this.company(req), id, seatId, body);
  }

  @Get('provider/bookings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.provider)
  providerBookings(@Req() req: AccountRequest) {
    return this.provider.bookings(this.company(req));
  }

  private company(req: AccountRequest): Company {
    if (!req.user.company) throw new BadRequestException(apiError('NO_COMPANY', 'This account has no company.'));
    return req.user.company;
  }

  private authShape(req: AccountRequest): PublicUser {
    return {
      id: req.user.id,
      username: req.user.username,
      name: req.user.name,
      phone: req.user.phone,
      role: req.user.role,
      company: req.user.company
        ? {
            id: req.user.company.id,
            en: req.user.company.nameEn,
            ar: req.user.company.nameAr,
            color: req.user.company.color,
            phone: req.user.company.phone,
          }
        : null,
    };
  }
}
