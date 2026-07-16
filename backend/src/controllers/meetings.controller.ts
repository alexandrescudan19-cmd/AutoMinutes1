import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CreateMeetingDto } from '../dto/meetings/create-meeting.dto';
import { UpdateMeetingDto } from '../dto/meetings/update-meeting.dto';
import { MeetingsService } from '../services/meetings.service';

@ApiTags('meetings')
@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @ApiOperation({ summary: 'Creeaza o sedinta' })
  @Post()
  create(@Body() createMeetingDto: CreateMeetingDto) {
    return this.meetingsService.create(createMeetingDto);
  }

  @ApiOperation({ summary: 'Listeaza toate sedintele' })
  @Get()
  findAll() {
    return this.meetingsService.findAll();
  }

  @ApiOperation({ summary: 'Returneaza o sedinta dupa ID' })
  @ApiParam({ name: 'id', description: 'ID-ul sedintei' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.meetingsService.findOne(id);
  }

  @ApiOperation({ summary: 'Actualizeaza o sedinta' })
  @ApiParam({ name: 'id', description: 'ID-ul sedintei' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMeetingDto: UpdateMeetingDto) {
    return this.meetingsService.update(id, updateMeetingDto);
  }

  @ApiOperation({ summary: 'Sterge o sedinta' })
  @ApiParam({ name: 'id', description: 'ID-ul sedintei' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.meetingsService.remove(id);
  }
}
