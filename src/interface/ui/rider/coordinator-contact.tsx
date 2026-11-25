export interface CoordinatorContactDetails {
  text: string;
  callHref?: string | undefined;
}

export function CoordinatorContact({ text, callHref }: CoordinatorContactDetails) {
  return callHref ? <a href={callHref}>{text}</a> : <>{text}</>;
}
