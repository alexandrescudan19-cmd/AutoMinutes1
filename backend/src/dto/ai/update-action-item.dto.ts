import { ApiPropertyOptional } from '@nestjs/swagger';
import { ActionItemStatus } from '../../models/action-item.schema';

export class UpdateActionItemDto {
  @ApiPropertyOptional({ example: 'Finalizeaza documentatia pentru demo' })
  task?: string;

  @ApiPropertyOptional({ example: 'Alex' })
  responsiblePerson?: string;

  @ApiPropertyOptional({ example: '2026-07-25T00:00:00.000Z' })
  dueDate?: string | null;

  @ApiPropertyOptional({ enum: ActionItemStatus, example: ActionItemStatus.Completed })
  status?: ActionItemStatus;

  @ApiPropertyOptional({ example: 0.85 })
  confidenceScore?: number;
}
