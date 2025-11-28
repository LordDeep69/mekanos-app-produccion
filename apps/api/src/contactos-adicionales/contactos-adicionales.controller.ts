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
import { ContactosAdicionalesService } from './contactos-adicionales.service';
import { CreateContactosAdicionalesDto } from './dto/create-contactos-adicionales.dto';
import { UpdateContactosAdicionalesDto } from './dto/update-contactos-adicionales.dto';

@Controller('contactos-adicionales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContactosAdicionalesController {
  constructor(
    private readonly contactosAdicionalesService: ContactosAdicionalesService,
  ) {}

  @Post()
  create(
    @Body() createDto: CreateContactosAdicionalesDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.contactosAdicionalesService.create(createDto, userId);
  }

  @Get()
  findAll(
    @Query('id_persona') idPersona?: string,
    @Query('activo') activo?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.contactosAdicionalesService.findAll({
      id_persona: idPersona ? parseInt(idPersona, 10) : undefined,
      activo: activo === 'true' ? true : activo === 'false' ? false : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.contactosAdicionalesService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateContactosAdicionalesDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.contactosAdicionalesService.update(id, updateDto, userId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.contactosAdicionalesService.remove(id);
  }
}
