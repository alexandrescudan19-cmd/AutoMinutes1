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
import { AttendanceStatus } from '../models/attendee.schema';

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
    // Expune crearea unui meeting. acum.
    return this.meetingsService.create(createMeetingDto, req.user);
  }

  @ApiOperation({ summary: 'Listeaza toate sedintele' })
  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    // Expune meetingurile accesibile userului. acum.
    return this.meetingsService.findAll(req.user);
  }

  @ApiOperation({ summary: 'Listeaza history-ul sedintelor cu search, sortare si paginare' })
  @Get('history')
  findHistory(@Query() query: MeetingHistoryQueryDto, @Req() req: AuthenticatedRequest) {
    // Expune history filtrat paginat. acum.
    return this.meetingsService.findHistory(req.user, query);
  }

  @ApiOperation({ summary: 'Cautare globala in meeting-uri si action items' })
  @Get('search/global')
  search(@Query('q') query: string, @Req() req: AuthenticatedRequest) {
    return this.meetingsService.search(req.user, query ?? '');
  }

  @ApiOperation({ summary: 'Listeaza invitatiile din aplicatie pentru un email' })
  @ApiParam({ name: 'email', description: 'Email-ul participantului' })
  @Get('invitations/email/:email')
  findInvitationsByEmail(@Param('email') email: string, @Req() req: AuthenticatedRequest) {
    // Expune invitatiile emailului curent. acum.
    return this.meetingsService.findInvitationsByEmail(email, req.user);
  }

  @ApiOperation({ summary: 'Listeaza invitatiile utilizatorului autentificat' })
  @Get('invitations')
  findMyInvitations(@Req() req: AuthenticatedRequest) {
    return this.meetingsService.findMyInvitations(req.user);
  }

  @ApiOperation({ summary: 'Accepta sau refuza o invitatie' })
  @Patch('invitations/:id/respond')
  respondToInvitation(
    @Param('id') id: string,
    @Body() body: { status: AttendanceStatus.Accepted | AttendanceStatus.Declined },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.meetingsService.respondToInvitation(id, body.status, req.user);
  }

  @ApiOperation({ summary: 'Listeaza notificarile din aplicatie pentru un email' })
  @ApiParam({ name: 'email', description: 'Email-ul participantului' })
  @Get('notifications/email/:email')
  findNotificationsByEmail(@Param('email') email: string, @Req() req: AuthenticatedRequest) {
    // Expune notificarile emailului curent. acum.
    return this.meetingsService.findNotificationsByEmail(email, req.user);
  }

  @ApiOperation({ summary: 'Listeaza notificarile utilizatorului autentificat' })
  @Get('notifications')
  findMyNotifications(@Req() req: AuthenticatedRequest) {
    return this.meetingsService.findMyNotifications(req.user);
  }

  @ApiOperation({ summary: 'Marcheaza o notificare ca citita' })
  @Patch('notifications/:id/read')
  markNotificationRead(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.meetingsService.markNotificationRead(id, req.user);
  }

  @ApiOperation({ summary: 'Marcheaza toate notificarile ca citite' })
  @Patch('notifications/read-all')
  markAllNotificationsRead(@Req() req: AuthenticatedRequest) {
    return this.meetingsService.markAllNotificationsRead(req.user);
  }

  @ApiOperation({ summary: 'Listeaza versiunile de transcript ale unei sedinte' })
  @ApiParam({ name: 'id', description: 'ID-ul sedintei' })
  @Get(':id/transcripts')
  findTranscriptVersions(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    // Expune istoricul transcripturilor meetingului. acum.
    return this.meetingsService.findTranscriptVersions(id, req.user);
  }

  @ApiOperation({ summary: 'Restaureaza o versiune mai veche de transcript' })
  @ApiParam({ name: 'id', description: 'ID-ul sedintei' })
  @ApiParam({ name: 'transcriptId', description: 'ID-ul transcriptului restaurat' })
  @Post(':id/transcripts/:transcriptId/restore')
  restoreTranscriptVersion(
    @Param('id') id: string,
    @Param('transcriptId') transcriptId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    // Expune restaurarea transcriptului ales. acum.
    return this.meetingsService.restoreTranscriptVersion(id, transcriptId, req.user);
  }

  @ApiOperation({ summary: 'Listeaza comentariile unei sedinte' })
  @Get(':id/comments')
  listComments(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.meetingsService.listComments(id, req.user);
  }

  @ApiOperation({ summary: 'Adauga un comentariu la o sedinta' })
  @Post(':id/comments')
  addComment(
    @Param('id') id: string,
    @Body() body: { message: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.meetingsService.addComment(id, body.message, req.user);
  }

  @ApiOperation({ summary: 'Genereaza link read-only de share pentru summary' })
  @Post(':id/share')
  createShareLink(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.meetingsService.createShareLink(id, req.user);
  }

  @ApiOperation({ summary: 'Returneaza o sedinta dupa ID' })
  @ApiParam({ name: 'id', description: 'ID-ul sedintei' })
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    // Expune meetingul dupa id. acum.
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
    // Expune actualizarea meetingului curent. acum.
    return this.meetingsService.update(id, updateMeetingDto, req.user);
  }

  @ApiOperation({ summary: 'Importa transcriptul generat de Google Meet dupa sedinta' })
  @ApiParam({ name: 'id', description: 'ID-ul sedintei' })
  @Post(':id/import-meet-transcript')
  importMeetTranscript(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    // Expune importul transcriptului Meet. acum.
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
    // Expune trimiterea invitatiilor noi. acum.
    return this.meetingsService.addInvitations(id, addMeetingInvitationsDto, req.user);
  }

  @ApiOperation({ summary: 'Listeaza participantii unei sedinte' })
  @ApiParam({ name: 'id', description: 'ID-ul sedintei' })
  @Get(':id/attendees')
  findAttendees(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    // Expune participantii meetingului curent. acum.
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
    // Expune adaugarea participantilor noi. acum.
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
    // Expune editarea participantului ales. acum.
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
    // Expune stergerea meetingului curent. acum.
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
    // Expune eliminarea participantului ales. acum.
    return this.meetingsService.removeAttendee(id, attendeeId, req.user);
  }
}

@ApiTags('public')
@Controller('public/meetings')
export class PublicMeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @ApiOperation({ summary: 'Returneaza un meeting partajat read-only' })
  @Get('share/:token')
  getSharedMeeting(@Param('token') token: string) {
    return this.meetingsService.getSharedMeeting(token);
  }
}
