import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ enum: ['light', 'dark'], example: 'dark' })
  themePreference?: 'light' | 'dark';
}
