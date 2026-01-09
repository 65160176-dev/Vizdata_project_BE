import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { UsersService } from '../users/users.service';
import { SellerService } from '../seller/seller.service';
import { RegisterDto } from '../users/dto/register.dto';
import { LoginDto } from '../users/dto/login.dto';
import { User, UserDocument } from '../users/schemas/user.schema';

// Store for temporary login codes (in production, use Redis)
const loginCodes = new Map<string, { telegramId: string; username: string; firstName: string; timestamp: number }>();

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sellerService: SellerService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { username, email, password, userType = 1 } = registerDto;

    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const existingUsername = await this.usersService.findByUsername(username);
    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await this.usersService.create({
      username,
      email,
      password: hashedPassword,
      userType,
      isActive: true,
    });

    // If user is a seller (userType = 0), create seller profile
    let seller: any = null;
    if (userType === 0) {
      try {
        seller = await this.sellerService.create(
          (user as UserDocument)._id as Types.ObjectId,
          username,
        );
      } catch (error) {
        // If seller creation fails, still allow user registration
        console.error('Failed to create seller profile:', error.message);
      }
    }

    // Generate token
    const token = this.generateToken(user);

    return {
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: String((user as UserDocument)._id),
          username: user.username,
          email: user.email,
          userType: user.userType,
          isActive: user.isActive,
          avatar: (user as any).avatar || null,
        },
        seller: seller ? {
          id: String((seller as any)._id),
          name: seller.name,
          display_name: seller.display_name,
        } : null,
        token,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate token
    const token = this.generateToken(user);

    return {
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: String((user as UserDocument)._id),
          username: user.username,
          email: user.email,
          userType: user.userType,
          isActive: user.isActive,
          avatar: (user as any).avatar || null,
        },
        token,
      },
    };
  }

  private generateToken(user: User): string {
    const payload = {
      userId: String((user as UserDocument)._id),
      username: user.username,
      email: user.email,
      userType: user.userType,
    };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.jwtService.sign(payload);
  }

  validateToken(token: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const decoded = this.jwtService.verify(token);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return decoded;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async resetPassword(email: string, password: string, confirmPassword: string) {
    // Validate input
    if (!email || !password || !confirmPassword) {
      throw new ConflictException('Email, password and confirm password are required');
    }

    if (password !== confirmPassword) {
      throw new ConflictException('Passwords do not match');
    }

    if (password.length < 6) {
      throw new ConflictException('Password must be at least 6 characters');
    }

    // Check if user exists
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new ConflictException('Email not found in system');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password
    await this.usersService.updatePassword(String((user as UserDocument)._id), hashedPassword);

    return {
      success: true,
      message: 'Password reset successfully',
    };
  }

  // OAuth Login (Facebook, Google, Telegram)
  async oAuthLogin(oAuthUser: any) {
    if (!oAuthUser) {
      throw new UnauthorizedException('No user from OAuth provider');
    }

    // Extract information based on provider
    let email = oAuthUser.email;
    let username = '';
    let firstName = oAuthUser.firstName || '';
    let lastName = oAuthUser.lastName || '';
    let provider = oAuthUser.provider;
    let providerId = '';

    if (provider === 'facebook') {
      providerId = oAuthUser.facebookId;
      username = oAuthUser.displayName || `fb_${oAuthUser.facebookId}`;
    } else if (provider === 'google') {
      providerId = oAuthUser.googleId;
      username = oAuthUser.displayName || `google_${oAuthUser.googleId}`;
    } else if (provider === 'telegram') {
      providerId = oAuthUser.telegramId;
      username = oAuthUser.username || `tg_${oAuthUser.telegramId}`;
      // Telegram may not have email
      email = email || `${oAuthUser.telegramId}@telegram.user`;
    }

    // Check if user exists by email
    let user = await this.usersService.findByEmail(email);

    if (!user) {
      // Create new user
      const randomPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      user = await this.usersService.create({
        username: username,
        email: email,
        password: hashedPassword, // OAuth users won't use password, but it's required
        userType: 1, // Default to regular user
        isActive: true,
      });
    }

    // Generate token
    const token = this.generateToken(user);

    return {
      success: true,
      message: 'OAuth login successful',
      data: {
        user: {
          id: String((user as UserDocument)._id),
          username: user.username,
          email: user.email,
          userType: user.userType,
          isActive: user.isActive,
          avatar: (user as any).avatar || null,
        },
        token,
        provider,
      },
    };
  }

  // Generate 6-digit code for Telegram login
  generateLoginCode(telegramId: string, username: string, firstName: string): string {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    loginCodes.set(code, {
      telegramId,
      username,
      firstName,
      timestamp: Date.now()
    });
    
    // Auto-expire after 5 minutes
    setTimeout(() => {
      loginCodes.delete(code);
    }, 5 * 60 * 1000);
    
    return code;
  }

  // Verify Telegram login code
  async verifyTelegramCode(code: string) {
    const codeData = loginCodes.get(code);
    
    if (!codeData) {
      throw new UnauthorizedException('Invalid or expired code');
    }
    
    // Check if code is expired (5 minutes)
    if (Date.now() - codeData.timestamp > 5 * 60 * 1000) {
      loginCodes.delete(code);
      throw new UnauthorizedException('Code has expired');
    }
    
    // Delete code after use
    loginCodes.delete(code);
    
    // Create or login user
    const oAuthUser = {
      provider: 'telegram',
      telegramId: codeData.telegramId,
      username: codeData.username,
      firstName: codeData.firstName,
      email: `${codeData.telegramId}@telegram.user`
    };
    
    return await this.oAuthLogin(oAuthUser);
  }
}
