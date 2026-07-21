import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { TranscriptsRepository } from '../repositories/transcripts.repository';

@ApiTags('transcripts')
@Controller('transcripts')
export class TranscriptsController {
  constructor(private readonly transcriptsRepository: TranscriptsRepository) {}

  @ApiOperation({ summary: 'Returneaza un transcript dupa ID' })
  @ApiParam({ name: 'id', description: 'ID-ul transcriptului' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const transcript = await this.transcriptsRepository.findOne(id);
    if (!transcript) {
      throw new NotFoundException(`Transcript #${id} not found`);
    }
    return transcript;
  }
}
