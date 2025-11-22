import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Put,
    Query,
    UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateFirmasAdministrativasDto } from './dto/create-firmas-administrativas.dto';
import { UpdateFirmasAdministrativasDto } from './dto/update-firmas-administrativas.dto';
import { FirmasAdministrativasService } from './firmas-administrativas.service';

@Controller('firmas-administrativas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FirmasAdministrativasController {
  constructor(
    private readonly firmasAdministrativasService: FirmasAdministrativasService,
  ) {}

  @Post()
  create(
    @Body() createDto: CreateFirmasAdministrativasDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.firmasAdministrativasService.create(createDto, userId);
  }

  @Get()
  findAll(
    @Query('firma_activa') firmaActiva?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.firmasAdministrativasService.findAll({
      firma_activa: firmaActiva === 'true' ? true : firmaActiva === 'false' ? false : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.firmasAdministrativasService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateFirmasAdministrativasDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.firmasAdministrativasService.update(id, updateDto, userId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.firmasAdministrativasService.remove(id);
  }
}
