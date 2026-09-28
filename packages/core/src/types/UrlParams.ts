type PathOf<TPattern extends string> =
  TPattern extends `${string}://${infer TRest}`
    ? TRest extends `${string}/${infer TPath}`
      ? TPath
      : ""
    : never;

type ParameterOf<TSegment extends string> = TSegment extends `:${infer TName}`
  ? TName
  : never;

type ParameterNames<TPath extends string> =
  TPath extends `${infer TSegment}/${infer TRest}`
    ? ParameterOf<TSegment> | ParameterNames<TRest>
    : ParameterOf<TPath>;

/**
 * The parameters a URL pattern captures, typed from its `:name` segments.
 *
 * @example
 * ```ts
 * type Params = UrlParams<"https://app.example.com/workspaces/:workspaceId">; // { workspaceId: string }
 * ```
 */
export type UrlParams<TPattern extends string> = {
  [TName in ParameterNames<PathOf<TPattern>>]: string;
};
