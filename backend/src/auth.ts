import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Role, type Company, type User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { apiError } from './http';
import { normalizeSyrianMobile, validPersonName } from './payment';
import { PrismaService } from './prisma.service';

const COLORS = ['#0e6b4f', '#1f4e79', '#8a5a12', '#6b3fa0', '#9c3b2e'];

export type PublicUser = {
  id: string;
  username: string;
  name: string;
  phone: string | null;
  role: Role;
  company: { id: string; en: string; ar: string; color: string; phone: string | null } | null;
};

type Account = User & { company: Company | null };

export function toPublicUser(user: Account): PublicUser {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    phone: user.phone,
    role: user.role,
    company: user.company
      ? {
          id: user.company.id,
          en: user.company.nameEn,
          ar: user.company.nameAr,
          color: user.company.color,
          phone: user.company.phone,
        }
      : null,
  };
}

function colorFor(username: string): string {
  let hash = 0;
  for (const char of username) hash = (hash + char.charCodeAt(0)) % COLORS.length;
  return COLORS[hash] ?? COLORS[0]!;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(input: {
    username?: string;
    password?: string;
    name?: string;
    phone?: string;
    role?: string;
    companyNameAr?: string;
    companyNameEn?: string;
  }): Promise<{ token: string; user: PublicUser }> {
    const username = (input.username ?? '').trim().toLowerCase();
    const password = input.password ?? '';
    const name = (input.name ?? '').trim().replace(/\s+/g, ' ');
    const role = input.role === 'provider' ? Role.provider : input.role === 'customer' ? Role.customer : null;
    if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
      throw new BadRequestException(apiError('USERNAME', 'Use 3–32 letters or numbers.'));
    }
    if (password.length < 8 || password.length > 72) {
      throw new BadRequestException(apiError('PASSWORD', 'Use at least 8 characters.'));
    }
    if (!validPersonName(name)) {
      throw new BadRequestException(apiError('NAME', 'Enter your name.'));
    }
    if (!role) throw new BadRequestException(apiError('ROLE', 'Choose passenger or bus company.'));
    let phone: string | null = null;
    if (input.phone?.trim()) {
      phone = normalizeSyrianMobile(input.phone);
      if (!phone) throw new BadRequestException(apiError('PHONE', 'Enter a Syrian mobile number.'));
    }
    const companyNameAr = (input.companyNameAr ?? '').trim();
    const companyNameEn = (input.companyNameEn ?? '').trim();
    if (role === Role.provider && (companyNameAr.length < 2 || companyNameEn.length < 2)) {
      throw new BadRequestException(apiError('COMPANY', 'Enter the company name in Arabic and English.'));
    }
    const taken = await this.prisma.user.findUnique({ where: { username } });
    if (taken) throw new ConflictException(apiError('USERNAME_TAKEN', 'That username is taken.'));
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        username,
        passwordHash,
        name,
        phone,
        role,
        company:
          role === Role.provider
            ? {
                create: {
                  nameAr: companyNameAr,
                  nameEn: companyNameEn,
                  color: colorFor(username),
                  phone,
                },
              }
            : undefined,
      },
      include: { company: true },
    });
    return { token: await this.sign(user), user: toPublicUser(user) };
  }

  async login(usernameRaw?: string, password?: string): Promise<{ token: string; user: PublicUser }> {
    const username = (usernameRaw ?? '').trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { username }, include: { company: true } });
    const matches = user ? await bcrypt.compare(password ?? '', user.passwordHash) : false;
    if (!user || !matches) {
      throw new UnauthorizedException(apiError('AUTH', 'Check the username and password.'));
    }
    return { token: await this.sign(user), user: toPublicUser(user) };
  }

  async account(userId: string): Promise<PublicUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { company: true } });
    return user ? toPublicUser(user) : null;
  }

  private sign(user: User): Promise<string> {
    return this.jwt.signAsync({ sub: user.id, username: user.username, role: user.role });
  }
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { sub?: string }): Promise<Account | null> {
    if (!payload.sub) return null;
    return this.prisma.user.findUnique({ where: { id: payload.sub }, include: { company: true } });
  }
}
