import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from '../users/dto/register.dto';
import { LoginDto } from '../users/dto/login.dto';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
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
        },
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
        },
        token,
      },
    };
  }

  private generateToken(user: User): string {
    const payload = {
      sub: String((user as UserDocument)._id),
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
}
