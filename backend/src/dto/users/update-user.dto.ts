import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Alex' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Ionescu' })
  lastName?: string;

  @ApiPropertyOptional({ enum: ['light', 'dark'], example: 'dark' })
  themePreference?: 'light' | 'dark';
}
