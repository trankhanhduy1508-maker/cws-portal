/**
 * Minimal, non-executing validation for customer Blender uploads.
 * A native .blend file starts with the ASCII signature "BLENDER".
 * This check does not open or execute the scene; deeper sandboxed
 * inspection remains a Worker/runtime requirement.
 */
export function hasBlenderHeader(buffer: Buffer): boolean {
  return buffer.length >= 7 && buffer.subarray(0, 7).toString('ascii') === 'BLENDER';
}
