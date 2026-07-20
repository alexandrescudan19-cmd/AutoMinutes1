import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../models/user.schema';

export class CreateUserDto {
  @ApiProperty({ example: 'Alex' })
  firstName!: string;

  @ApiProperty({ example: 'Popescu' })
  lastName!: string;

  @ApiProperty({ example: 'alex.popescu@example.com' })
  email!: string;

  @ApiProperty({ example: 'Parola123!' })
  password!: string;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.User })
  role?: UserRole;
}
