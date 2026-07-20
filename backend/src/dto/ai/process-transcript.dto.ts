import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProcessTranscriptDto {
  @ApiProperty({
    description: 'ID-ul unei sedinte existente.',
    example: '6a56b54c1d6c88b741cc36e5',
  })
  meetingId!: string;

  @ApiPropertyOptional({
    description: 'Foloseste acest camp doar daca transcriptul exista deja in baza de date.',
  })
  transcriptId?: string;

  @ApiPropertyOptional({
    description: 'Textul brut al transcriptului. Daca este trimis, se creeaza un transcript nou.',
    example:
      'Alex: Trebuie sa finalizam integrarea cu Google Calendar. Maria: Ma ocup eu pana vineri.',
  })
  transcript?: string;

  @ApiPropertyOptional({ example: 'text' })
  fileFormat?: string;

  @ApiPropertyOptional({ example: 'ro' })
  language?: string;
}
