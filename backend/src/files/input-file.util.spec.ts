import { ACCEPTED_INPUT_EXTENSIONS, getInputFormat } from './input-file.util';

describe('input file format contract', () => {
  it('accepts blend, zip and rar case-insensitively', () => {
    expect(ACCEPTED_INPUT_EXTENSIONS).toEqual(['.blend', '.zip', '.rar']);
    expect(getInputFormat('scene.blend')).toBe('blend');
    expect(getInputFormat('PROJECT.ZIP')).toBe('zip');
    expect(getInputFormat('PROJECT.RAR')).toBe('rar');
  });

  it('does not infer a format from an unsafe or missing name', () => {
    expect(getInputFormat('scene.blend.exe')).toBeNull();
    expect(getInputFormat('../scene')).toBeNull();
    expect(getInputFormat(null)).toBeNull();
  });
});
