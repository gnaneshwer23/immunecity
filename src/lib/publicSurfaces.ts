/** Internal tools remain routable for authorised staff, never public marketing destinations. */
export const INTERNAL_TOOL_PATHS = ["/internal-research", "/hsi/discovery", "/hsi-consume", "/patient", "/simulator", "/reasoning", "/scientific-ai", "/research-workbench"] as const;
export function isInternalToolPath(path: string) {
  return INTERNAL_TOOL_PATHS.some((p) => path.split(/[?#]/)[0] === p);
}
