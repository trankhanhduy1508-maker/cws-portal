import { ACCEPTED_INPUT_EXTENSIONS, getInputFormat } from './input-file.util';

describe('input file format contract', () => {
  it('accepts blend and zip case-insensitively', () => {
    expect(ACCEPTED_INPUT_EXTENSIONS).toEqual(['.blend', '.zip']);
    expect(getInputFormat('scene.blend')).toBe('blend');
    expect(getInputFormat('PROJECT.ZIP')).toBe('zip');
  });

  it('does not infer a format from an unsafe or missing name', () => {
    expect(getInputFormat('scene.blend.exe')).toBeNull();
    expect(getInputFormat('../scene')).toBeNull();
    expect(getInputFormat(null)).toBeNull();
  });
});
