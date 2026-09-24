import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ApiController } from './api.controller';
import { AuthService, JwtStrategy } from './auth';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard, RolesGuard } from './guards';
import { PrismaService } from './prisma.service';
import { ProviderService } from './provider.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: 60 * 60 * 24 * 7 },
      }),
    }),
  ],
  controllers: [ApiController],
  providers: [PrismaService, AuthService, JwtStrategy, JwtAuthGuard, RolesGuard, BookingsService, ProviderService],
})
export class AppModule {}
