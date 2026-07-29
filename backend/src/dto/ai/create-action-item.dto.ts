import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActionItemStatus } from '../../models/action-item.schema';

export class CreateActionItemDto {
  @ApiProperty({ example: 'Trimite raportul final' })
  task!: string;

  @ApiProperty({ example: 'Maria Ionescu' })
  responsiblePerson!: string;

  @ApiPropertyOptional({ example: '2026-08-01' })
  dueDate?: string | Date;

  @ApiPropertyOptional({ enum: ActionItemStatus, example: ActionItemStatus.Pending })
  status?: ActionItemStatus;
}
