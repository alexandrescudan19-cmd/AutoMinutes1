import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser, MeetingsService } from '../services/meetings.service';

interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

@ApiTags('transcripts')
@Controller('transcripts')
@UseGuards(AuthGuard('jwt'))
export class TranscriptsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @ApiOperation({ summary: 'Returneaza un transcript dupa ID' })
  @ApiParam({ name: 'id', description: 'ID-ul transcriptului' })
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    // Expune transcriptul cu acces. acum.
    return this.meetingsService.findTranscriptForMeetingUser(id, req.user);
  }
}
