import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GoogleDriveService } from './google-drive.service';
import { B2StorageService } from './b2-storage.service';

describe('GoogleDriveService folder projects', () => {
  let service: GoogleDriveService;
  let fetchSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GoogleDriveService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('test-key') } },
        { provide: B2StorageService, useValue: {} },
      ],
    }).compile();
    service = module.get(GoogleDriveService);
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => fetchSpy.mockRestore());

  it('resolves exactly one supported project and returns a canonical file link', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        files: [
          { id: 'blend-id', name: 'scene.blend', size: '1234' },
          { id: 'notes-id', name: 'notes.txt', size: '12' },
        ],
      }),
    } as Response);
    await expect(
      service.resolve('https://drive.google.com/drive/folders/folder-id'),
    ).resolves.toEqual({
      fileName: 'scene.blend',
      fileSizeBytes: 1234,
      resolvedDriveLink: 'https://drive.google.com/file/d/blend-id/view',
    });
  });

  it('rejects an ambiguous folder instead of choosing a project', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        files: [
          { id: 'one', name: 'one.blend' },
          { id: 'two', name: 'two.zip' },
        ],
      }),
    } as Response);
    await expect(
      service.resolve('https://drive.google.com/drive/folders/folder-id'),
    ).rejects.toThrow(/multiple/);
  });
});
