import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CreateAttendeeDto } from '../dto/attendees/create-attendee.dto';
import { UpdateAttendeeDto } from '../dto/attendees/update-attendee.dto';
import { AttendeesService } from '../services/attendees.service';

@ApiTags('attendees')
@Controller('attendees')
@UseGuards(AuthGuard('jwt'))
export class AttendeesController {
  constructor(private readonly attendeesService: AttendeesService) {}

  @ApiOperation({ summary: 'Listeaza toti participantii' })
  @Get()
  findAll() {
    // Expune participantii salvati global. acum.
    return this.attendeesService.findAll();
  }

  @ApiOperation({ summary: 'Creeaza un participant' })
  @Post()
  create(@Body() createAttendeeDto: CreateAttendeeDto) {
    // Creeaza participant nou global. acum.
    return this.attendeesService.create(createAttendeeDto);
  }

  @ApiOperation({ summary: 'Returneaza un participant dupa ID' })
  @ApiParam({ name: 'id', description: 'ID-ul participantului' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    // Expune participantul dupa id. acum.
    return this.attendeesService.findOne(id);
  }

  @ApiOperation({ summary: 'Actualizeaza un participant' })
  @ApiParam({ name: 'id', description: 'ID-ul participantului' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAttendeeDto: UpdateAttendeeDto) {
    // Actualizeaza participantul dupa id. acum.
    return this.attendeesService.update(id, updateAttendeeDto);
  }

  @ApiOperation({ summary: 'Sterge un participant din lista salvata' })
  @ApiParam({ name: 'id', description: 'ID-ul participantului' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    // Sterge participantul dupa id. acum.
    return this.attendeesService.remove(id);
  }
}
