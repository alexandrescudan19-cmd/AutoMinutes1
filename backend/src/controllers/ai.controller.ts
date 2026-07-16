import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ProcessTranscriptDto } from '../dto/ai/process-transcript.dto';
import { AiService } from '../services/ai.service';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @ApiOperation({ summary: 'Verifica statusul serviciului AI' })
  @Get()
  getStatus() {
    return this.aiService.getStatus();
  }

  @ApiOperation({ summary: 'Proceseaza transcriptul unei sedinte cu AI' })
  @Post('process-transcript')
  processTranscript(@Body() processTranscriptDto: ProcessTranscriptDto) {
    return this.aiService.processTranscript(processTranscriptDto);
  }

  @ApiOperation({ summary: 'Proceseaza un transcript complet trimis ca text simplu' })
  @ApiConsumes('text/plain')
  @ApiQuery({ name: 'meetingId', description: 'ID-ul sedintei existente' })
  @ApiQuery({ name: 'language', required: false, example: 'ro' })
  @ApiQuery({ name: 'fileFormat', required: false, example: 'text' })
  @ApiBody({
    schema: {
      type: 'string',
      example:
        'Meeting: Sprint Planning - AutoMinutes\nDate: July 15, 2026\n\nDan: Alex, pregateste transcripturile pana joi.',
    },
  })
  @Post('process-transcript/raw')
  processRawTranscript(
    @Query('meetingId') meetingId: string,
    @Body() transcript: string,
    @Query('language') language = 'ro',
    @Query('fileFormat') fileFormat = 'text',
  ) {
    return this.aiService.processTranscript({
      meetingId,
      transcript,
      fileFormat,
      language,
    });
  }
}
