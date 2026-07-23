import { ApiPropertyOptional } from '@nestjs/swagger';
import { ActionItemStatus } from '../../models/action-item.schema';

export class UpdateActionItemDto {
  @ApiPropertyOptional({ example: 'Trimite raportul final' })
  task?: string;

  @ApiPropertyOptional({ example: 'Maria Ionescu' })
  responsiblePerson?: string;

  @ApiPropertyOptional({ example: '2026-08-01' })
  dueDate?: string | Date;

  @ApiPropertyOptional({ enum: ActionItemStatus, example: ActionItemStatus.InProgress })
  status?: ActionItemStatus;

  @ApiPropertyOptional({ example: 0.85 })
  confidenceScore?: number;
}
