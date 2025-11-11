/**
 * Base Query interface for CQRS pattern
 */

export interface IQuery {
  readonly type: string;
}

export interface IQueryHandler<TQuery extends IQuery, TResult> {
  execute(query: TQuery): Promise<TResult>;
}
