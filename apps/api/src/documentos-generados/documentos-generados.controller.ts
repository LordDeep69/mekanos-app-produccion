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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DocumentosGeneradosService } from './documentos-generados.service';
import { CreateDocumentosGeneradosDto } from './dto/create-documentos-generados.dto';
import { UpdateDocumentosGeneradosDto } from './dto/update-documentos-generados.dto';

@Controller('documentos-generados')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentosGeneradosController {
  constructor(private readonly documentosGeneradosService: DocumentosGeneradosService) {}

  @Post()
  create(@Body() createDto: CreateDocumentosGeneradosDto) {
    return this.documentosGeneradosService.create(createDto);
  }

  @Get()
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.documentosGeneradosService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.documentosGeneradosService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateDocumentosGeneradosDto,
  ) {
    return this.documentosGeneradosService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.documentosGeneradosService.remove(id);
  }
}
