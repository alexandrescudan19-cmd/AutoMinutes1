import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProcessTranscriptDto } from '../dto/ai/process-transcript.dto';
import { UpdateActionItemDto } from '../dto/ai/update-action-item.dto';
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

  @ApiOperation({ summary: 'Actualizeaza un action item extras de AI' })
  @ApiParam({ name: 'id', description: 'ID-ul action item-ului' })
  @Patch('action-items/:id')
  updateActionItem(
    @Param('id') id: string,
    @Body() updateActionItemDto: UpdateActionItemDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.aiService.updateActionItem(id, updateActionItemDto, req.user);
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

  @ApiOperation({ summary: 'Proceseaza un transcript incarcat ca fisier text' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'meetingId', description: 'ID-ul sedintei existente' })
  @ApiQuery({ name: 'language', required: false, example: 'ro' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @Post('process-transcript/upload')
  @UseInterceptors(FileInterceptor('file'))
  processUploadedTranscript(
    @Query('meetingId') meetingId: string,
    @Query('language') language = 'ro',
    @Req() req: AuthenticatedRequest,
    @UploadedFile()
    file?: { buffer?: Buffer; originalname?: string; mimetype?: string },
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Incarca un fisier transcript in campul "file".');
    }

    const transcript = file.buffer.toString('utf8');
    const fileFormat = file.originalname?.split('.').pop() || 'text';

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
