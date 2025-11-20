import { ICommand } from '@nestjs/cqrs';

export class DesactivarCatalogoSistemaCommand implements ICommand {
  constructor(public readonly id_sistema: number) {}
}
