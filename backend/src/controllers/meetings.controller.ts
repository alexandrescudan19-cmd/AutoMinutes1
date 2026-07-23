import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AddMeetingInvitationsDto } from '../dto/meetings/add-meeting-invitations.dto';
import { UpdateAttendeeDto } from '../dto/attendees/update-attendee.dto';
import { CreateMeetingDto } from '../dto/meetings/create-meeting.dto';
import { MeetingHistoryQueryDto } from '../dto/meetings/meeting-history-query.dto';
import { UpdateMeetingDto } from '../dto/meetings/update-meeting.dto';
import { AuthenticatedUser, MeetingsService } from '../services/meetings.service';

interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

@ApiTags('meetings')
@Controller('meetings')
@UseGuards(AuthGuard('jwt'))
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @ApiOperation({ summary: 'Creeaza o sedinta' })
  @Post()
  create(@Body() createMeetingDto: CreateMeetingDto, @Req() req: AuthenticatedRequest) {
    return this.meetingsService.create(createMeetingDto, req.user);
  }

  @ApiOperation({ summary: 'Listeaza toate sedintele' })
  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.meetingsService.findAll(req.user);
  }

  @ApiOperation({ summary: 'Listeaza history-ul sedintelor cu search, sortare si paginare' })
  @Get('history')
  findHistory(@Query() query: MeetingHistoryQueryDto, @Req() req: AuthenticatedRequest) {
    return this.meetingsService.findHistory(req.user, query);
  }

  @ApiOperation({ summary: 'Listeaza invitatiile din aplicatie pentru un email' })
  @ApiParam({ name: 'email', description: 'Email-ul participantului' })
  @Get('invitations/email/:email')
  findInvitationsByEmail(@Param('email') email: string, @Req() req: AuthenticatedRequest) {
    return this.meetingsService.findInvitationsByEmail(email, req.user);
  }

  @ApiOperation({ summary: 'Listeaza notificarile din aplicatie pentru un email' })
  @ApiParam({ name: 'email', description: 'Email-ul participantului' })
  @Get('notifications/email/:email')
  findNotificationsByEmail(@Param('email') email: string, @Req() req: AuthenticatedRequest) {
    return this.meetingsService.findNotificationsByEmail(email, req.user);
  }

  @ApiOperation({ summary: 'Returneaza o sedinta dupa ID' })
  @ApiParam({ name: 'id', description: 'ID-ul sedintei' })
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.meetingsService.findOne(id, req.user);
  }

  @ApiOperation({ summary: 'Actualizeaza o sedinta' })
  @ApiParam({ name: 'id', description: 'ID-ul sedintei' })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateMeetingDto: UpdateMeetingDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.meetingsService.update(id, updateMeetingDto, req.user);
  }

  @ApiOperation({ summary: 'Importa transcriptul generat de Google Meet dupa sedinta' })
  @ApiParam({ name: 'id', description: 'ID-ul sedintei' })
  @Post(':id/import-meet-transcript')
  importMeetTranscript(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.meetingsService.importMeetTranscript(id, req.user);
  }

  @ApiOperation({ summary: 'Trimite invitatii noi pentru o sedinta existenta' })
  @ApiParam({ name: 'id', description: 'ID-ul sedintei' })
  @Post(':id/invitations')
  addInvitations(
    @Param('id') id: string,
    @Body() addMeetingInvitationsDto: AddMeetingInvitationsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.meetingsService.addInvitations(id, addMeetingInvitationsDto, req.user);
  }

  @ApiOperation({ summary: 'Listeaza participantii unei sedinte' })
  @ApiParam({ name: 'id', description: 'ID-ul sedintei' })
  @Get(':id/attendees')
  findAttendees(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.meetingsService.findAttendeesForMeeting(id, req.user);
  }

  @ApiOperation({ summary: 'Adauga participanti intr-o sedinta existenta' })
  @ApiParam({ name: 'id', description: 'ID-ul sedintei' })
  @Post(':id/attendees')
  addAttendees(
    @Param('id') id: string,
    @Body() addMeetingInvitationsDto: AddMeetingInvitationsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.meetingsService.addInvitations(id, addMeetingInvitationsDto, req.user);
  }

  @ApiOperation({ summary: 'Actualizeaza un participant dintr-o sedinta' })
  @ApiParam({ name: 'id', description: 'ID-ul sedintei' })
  @ApiParam({ name: 'attendeeId', description: 'ID-ul participantului' })
  @Patch(':id/attendees/:attendeeId')
  updateAttendee(
    @Param('id') id: string,
    @Param('attendeeId') attendeeId: string,
    @Body() updateAttendeeDto: UpdateAttendeeDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.meetingsService.updateAttendeeForMeeting(
      id,
      attendeeId,
      updateAttendeeDto,
      req.user,
    );
  }

  @ApiOperation({ summary: 'Sterge o sedinta' })
  @ApiParam({ name: 'id', description: 'ID-ul sedintei' })
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.meetingsService.remove(id, req.user);
  }

  @ApiOperation({ summary: 'Elimina un participant dintr-o sedinta' })
  @ApiParam({ name: 'id', description: 'ID-ul sedintei' })
  @ApiParam({ name: 'attendeeId', description: 'ID-ul participantului' })
  @Delete(':id/attendees/:attendeeId')
  removeAttendee(
    @Param('id') id: string,
    @Param('attendeeId') attendeeId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.meetingsService.removeAttendee(id, attendeeId, req.user);
  }
}
