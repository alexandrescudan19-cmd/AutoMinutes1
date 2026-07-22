import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ProcessTranscriptDto } from '../dto/ai/process-transcript.dto';
import { ActionItemStatus } from '../models/action-item.schema';
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

  @ApiOperation({ summary: 'Listeaza action items extrase de AI pentru meeting-urile accesibile' })
  @ApiQuery({ name: 'status', required: false, enum: ActionItemStatus })
  @Get('action-items')
  listActionItems(@Req() req: AuthenticatedRequest, @Query('status') status?: ActionItemStatus) {
    return this.aiService.listActionItems(req.user, { status });
  }

  @ApiOperation({ summary: 'Returneaza un AI result complet' })
  @ApiParam({ name: 'id', description: 'ID-ul rezultatului AI' })
  @Get('results/:id')
  getResult(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.aiService.getResult(id, req.user);
  }

  @ApiOperation({ summary: 'Returneaza doar summary-ul unui AI result' })
  @ApiParam({ name: 'id', description: 'ID-ul rezultatului AI' })
  @Get('results/:id/summary')
  getSummary(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.aiService.getSummary(id, req.user);
  }

  @ApiOperation({ summary: 'Returneaza doar key points pentru un AI result' })
  @ApiParam({ name: 'id', description: 'ID-ul rezultatului AI' })
  @Get('results/:id/key-points')
  getKeyPoints(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.aiService.getKeyPoints(id, req.user);
  }

  @ApiOperation({ summary: 'Returneaza doar deciziile pentru un AI result' })
  @ApiParam({ name: 'id', description: 'ID-ul rezultatului AI' })
  @Get('results/:id/decisions')
  getDecisions(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.aiService.getDecisions(id, req.user);
  }

  @ApiOperation({ summary: 'Returneaza doar action items pentru un AI result' })
  @ApiParam({ name: 'id', description: 'ID-ul rezultatului AI' })
  @Get('results/:id/action-items')
  getActionItems(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.aiService.getActionItems(id, req.user);
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
