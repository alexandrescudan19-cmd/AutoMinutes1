import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ProcessTranscriptDto } from '../dto/ai/process-transcript.dto';
import { AiService } from '../services/ai.service';
import { AuthenticatedUser } from '../services/meetings.service';

interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

@ApiTags('ai')
@Controller('ai')
@UseGuards(AuthGuard('jwt'))
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @ApiOperation({ summary: 'Verifica statusul serviciului AI' })
  @Get()
  getStatus() {
    return this.aiService.getStatus();
  }

  @ApiOperation({ summary: 'Proceseaza transcriptul unei sedinte cu AI' })
  @Post('process-transcript')
  processTranscript(
    @Body() processTranscriptDto: ProcessTranscriptDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.aiService.processTranscript(processTranscriptDto, req.user);
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
    @Req() req: AuthenticatedRequest,
  ) {
    return this.aiService.processTranscript(
      {
        meetingId,
        transcript,
        fileFormat,
        language,
      },
      req.user,
    );
  }
}
