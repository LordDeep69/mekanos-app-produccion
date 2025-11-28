import { Injectable } from '@nestjs/common';
import { catalogo_sistemas, Prisma } from '@prisma/client';
import { ActualizarCatalogoSistemasDto } from '../application/dto/actualizar-catalogo-sistemas.dto';
import { CatalogoSistemasResponseDto } from '../application/dto/catalogo-sistemas-response.dto';
import { CrearCatalogoSistemasDto } from '../application/dto/crear-catalogo-sistemas.dto';

@Injectable()
export class CatalogoSistemasMapper {
  /**
   * Convierte de snake_case (Prisma) a camelCase (DTO Response)
   */
  toCamelCase(entity: catalogo_sistemas): CatalogoSistemasResponseDto {
    return {
      idSistema: entity.id_sistema,
      codigoSistema: entity.codigo_sistema,
      nombreSistema: entity.nombre_sistema,
      descripcion: entity.descripcion,
      aplicaA: entity.aplica_a,
      ordenVisualizacion: entity.orden_visualizacion,
      icono: entity.icono,
      colorHex: entity.color_hex,
      activo: entity.activo ?? true,
      observaciones: entity.observaciones,
      fechaCreacion: entity.fecha_creacion ?? new Date(),
    };
  }

  /**
   * Convierte array de entidades Prisma a array de DTOs
   */
  toCamelCaseList(entities: catalogo_sistemas[]): CatalogoSistemasResponseDto[] {
    return entities.map((entity) => this.toCamelCase(entity));
  }

  /**
   * Convierte de camelCase (DTO) a snake_case (Prisma) para CREATE
   */
  toSnakeCaseCreate(dto: CrearCatalogoSistemasDto): Prisma.catalogo_sistemasCreateInput {
    return {
      codigo_sistema: dto.codigoSistema.toUpperCase().trim(),
      nombre_sistema: dto.nombreSistema,
      descripcion: dto.descripcion,
      aplica_a: dto.aplicaA || [],
      orden_visualizacion: dto.ordenVisualizacion,
      icono: dto.icono,
      color_hex: dto.colorHex,
      activo: dto.activo ?? true,
      observaciones: dto.observaciones,
    };
  }

  /**
   * Convierte de camelCase (DTO) a snake_case (Prisma) para UPDATE
   */
  toSnakeCaseUpdate(dto: ActualizarCatalogoSistemasDto): Prisma.catalogo_sistemasUpdateInput {
    const updateData: Prisma.catalogo_sistemasUpdateInput = {};

    if (dto.nombreSistema !== undefined) updateData.nombre_sistema = dto.nombreSistema;
    if (dto.descripcion !== undefined) updateData.descripcion = dto.descripcion;
    if (dto.aplicaA !== undefined) updateData.aplica_a = dto.aplicaA;
    if (dto.ordenVisualizacion !== undefined) updateData.orden_visualizacion = dto.ordenVisualizacion;
    if (dto.icono !== undefined) updateData.icono = dto.icono;
    if (dto.colorHex !== undefined) updateData.color_hex = dto.colorHex;
    if (dto.activo !== undefined) updateData.activo = dto.activo;
    if (dto.observaciones !== undefined) updateData.observaciones = dto.observaciones;

    return updateData;
  }
}
