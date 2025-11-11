/**
 * Base Command interface for CQRS pattern
 */

export interface ICommand {
  readonly type: string;
}

export interface ICommandHandler<TCommand extends ICommand, TResult = void> {
  execute(command: TCommand): Promise<TResult>;
}
