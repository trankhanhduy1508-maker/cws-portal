export type SupportedInputFormat = 'blend' | 'zip';

export const ACCEPTED_INPUT_EXTENSIONS = ['.blend', '.zip'] as const;

export function getInputFormat(
  fileName: string | null | undefined,
): SupportedInputFormat | null {
  const name = String(fileName ?? '')
    .trim()
    .toLowerCase();
  if (name.endsWith('.blend')) return 'blend';
  if (name.endsWith('.zip')) return 'zip';
  return null;
}
