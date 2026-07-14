import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from '../dto/users/create-user.dto';
import { UpdateUserDto } from '../dto/users/update-user.dto';
import { User } from '../models/user.schema';
import { UsersRepository } from '../repositories/users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  create(createUserDto: CreateUserDto): Promise<User> {
    const { password, ...userData } = createUserDto;
    return this.usersRepository.create({
      ...userData,
      passwordHash: password,
    });
  }

  findAll(): Promise<User[]> {
    return this.usersRepository.findAll();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne(id);
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const { password, ...userData } = updateUserDto;
    const user = await this.usersRepository.update(id, {
      ...userData,
      ...(password ? { passwordHash: password } : {}),
    });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }

  async remove(id: string): Promise<User> {
    const user = await this.usersRepository.remove(id);
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }
}
