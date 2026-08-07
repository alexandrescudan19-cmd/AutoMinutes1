import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UpdateUserDto } from '../dto/users/update-user.dto';
import { UsersService } from '../services/users.service';
import { AuthenticatedUser } from '../services/meetings.service';

interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

@ApiTags('users')
@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Returneaza contul utilizatorului curent' })
  @Get('me')
  getMe(@Req() req: AuthenticatedRequest) {
    // Expune profilul userului curent. acum.
    return this.usersService.getMe(req.user.userId);
  }

  @ApiOperation({ summary: 'Admin dashboard stats' })
  @Get('admin/stats')
  getAdminStats(@Req() req: AuthenticatedRequest) {
    return this.usersService.getAdminStats(req.user.role);
  }

  @ApiOperation({ summary: 'Listeaza utilizatorii pentru admin' })
  @Get('admin/users')
  listUsers(@Req() req: AuthenticatedRequest) {
    return this.usersService.listUsers(req.user.role);
  }

  @ApiOperation({ summary: 'Actualizeaza preferintele contului curent (ex: tema)' })
  @Patch('me')
  updateMe(@Body() updateUserDto: UpdateUserDto, @Req() req: AuthenticatedRequest) {
    // Actualizeaza profilul userului curent. acum.
    return this.usersService.updateMe(req.user.userId, updateUserDto);
  }
}
