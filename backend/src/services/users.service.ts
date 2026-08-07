import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from '../repositories/users.repository';
import { UpdateUserDto } from '../dto/users/update-user.dto';
import { User } from '../models/user.schema';

type SanitizedUser = Omit<
  User,
  | 'passwordHash'
  | 'verificationToken'
  | 'resetPasswordToken'
  | 'resetPasswordExpires'
  | 'googleRefreshTokenEncrypted'
>;

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getMe(userId: string): Promise<SanitizedUser> {
    // Returneaza profilul utilizatorului curent. acum.
    const user = await this.usersRepository.findOne(userId);
    if (!user) {
      throw new NotFoundException('Utilizatorul nu a fost gasit.');
    }
    return this.sanitize(user);
  }

  async updateMe(userId: string, dto: UpdateUserDto): Promise<SanitizedUser> {
    // Actualizeaza setarile utilizatorului curent. acum.
    const user = await this.usersRepository.update(userId, {
      firstName: dto.firstName?.trim(),
      lastName: dto.lastName?.trim(),
      themePreference: dto.themePreference,
    });
    if (!user) {
      throw new NotFoundException('Utilizatorul nu a fost gasit.');
    }
    return this.sanitize(user);
  }

  private sanitize(user: User): SanitizedUser {
    // Elimina campurile sensibile din raspuns.
    const {
      passwordHash,
      verificationToken,
      resetPasswordToken,
      resetPasswordExpires,
      googleRefreshTokenEncrypted,
      ...rest
    } = user;
    void passwordHash;
    void verificationToken;
    void resetPasswordToken;
    void resetPasswordExpires;
    void googleRefreshTokenEncrypted;
    return rest;
  }
}
