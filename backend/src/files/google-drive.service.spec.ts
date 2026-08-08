import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { GoogleDriveService } from './google-drive.service';
import { B2StorageService } from './b2-storage.service';

describe('GoogleDriveService', () => {
  let service: GoogleDriveService;
  let b2StorageMock: { uploadFile: jest.Mock };

  beforeEach(async () => {
    b2StorageMock = { uploadFile: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleDriveService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(null) }, // không cấu hình API key
        },
        { provide: B2StorageService, useValue: b2StorageMock },
      ],
    }).compile();

    service = module.get(GoogleDriveService);
  });

  describe('phát hiện link FOLDER (bài học thật từ sự cố CWS-JOB5)', () => {
    it('từ chối link dạng /folders/ với thông báo rõ ràng, không để Worker tự khám phá lỗi sau', async () => {
      const folderLink =
        'https://drive.google.com/drive/mobile/folders/10mcJB2yU1duJG8xWk1iRWKTZQDOYo8_B';
      await expect(service.resolve(folderLink)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.resolve(folderLink)).rejects.toThrow(/THƯ MỤC/);
    });
  });

  describe('trích file ID hợp lệ', () => {
    it('dùng public direct download khi Backend không có Google Drive API key', async () => {
      const bytes = Buffer.concat([
        Buffer.from('BLENDER'),
        Buffer.from([45, 118, 50]),
      ]);
      b2StorageMock.uploadFile.mockResolvedValue({
        key: 'uploads/public-scene.blend',
      });
      const fetchSpy = jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(
          new Response(
            '<form><input name="uuid" value="uuid-1"></form><a>scene.blend (1M)</a>',
            { headers: { 'content-type': 'text/html' } },
          ),
        )
        .mockResolvedValueOnce(
          new Response(bytes, {
            headers: {
              'content-type': 'application/octet-stream',
              'content-disposition': 'attachment; filename="scene.blend"',
              'content-length': String(bytes.length),
            },
          }),
        );
      await expect(
        service.resolve(
          'https://drive.google.com/file/d/1vDKbOXoUbk7XwF7Y6xomDwdAzkPWPnyJ/view?usp=drivesdk',
        ),
      ).resolves.toMatchObject({
        fileRef: 'uploads/public-scene.blend',
        fileName: 'scene.blend',
        fileSizeBytes: bytes.length,
      });
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      fetchSpy.mockRestore();
    });

    it('hướng dẫn rõ ràng khi public link không có trang xác nhận tải', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response('<html><title>Sign in</title></html>', {
          headers: { 'content-type': 'text/html' },
        }),
      );
      await expect(
        service.resolve(
          'https://drive.google.com/open?id=1vDKbOXoUbk7XwF7Y6xomDwdAzkPWPnyJ',
        ),
      ).rejects.toThrow(/Anyone with the link/);
      fetchSpy.mockRestore();
    });
  });

  describe('link không phải Google Drive (OneDrive/Dropbox/Direct Link)', () => {
    it('chấp nhận nhưng trả null thay vì bịa dữ liệu (chưa có API thật cho nguồn này)', async () => {
      const result = await service.resolve('https://1drv.ms/f/abc123');
      expect(result).toEqual({ fileName: null, fileSizeBytes: null });
    });
  });

  describe('link Google Drive nhưng không nhận diện được ID', () => {
    it('từ chối link Google Drive không đúng cú pháp file/id', async () => {
      await expect(
        service.resolve('https://drive.google.com/random-unrecognized-path'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('kiểm tra quyền truy cập (CWS_ROADMAP_MVP_V1.md Giai đoạn 2 — "Kiểm tra quyền truy cập"/"Hướng dẫn sửa quyền")', () => {
    let serviceWithApiKey: GoogleDriveService;
    let fetchSpy: jest.SpyInstance;
    let b2Storage: { uploadFile: jest.Mock };

    beforeEach(async () => {
      b2Storage = {
        uploadFile: jest
          .fn()
          .mockResolvedValue({ key: 'uploads/drive-project.blend' }),
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GoogleDriveService,
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue('fake-api-key') },
          },
          { provide: B2StorageService, useValue: b2Storage },
        ],
      }).compile();
      serviceWithApiKey = module.get(GoogleDriveService);
      fetchSpy = jest.spyOn(global, 'fetch');
    });

    afterEach(() => {
      fetchSpy.mockRestore();
    });

    it('file KHÔNG chia sẻ "Bất kỳ ai có link" (Google Drive API trả 404 cho file private khi dùng API key) -> lỗi rõ ràng, hướng dẫn cách sửa', async () => {
      fetchSpy.mockResolvedValue({ ok: false, status: 404 } as Response);
      const link =
        'https://drive.google.com/file/d/1vDKbOXoUbk7XwF7Y6xomDwdAzkPWPnyJ/view';

      await expect(serviceWithApiKey.resolve(link)).rejects.toThrow(
        BadRequestException,
      );
      await expect(serviceWithApiKey.resolve(link)).rejects.toThrow(
        /quyền chia sẻ/,
      );
    });

    it('file CÓ quyền truy cập -> trả về đúng tên/dung lượng thật từ API', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ name: 'Titan Station.blend', size: '104857600' }),
      } as Response);
      const link =
        'https://drive.google.com/file/d/1vDKbOXoUbk7XwF7Y6xomDwdAzkPWPnyJ/view';

      const result = await serviceWithApiKey.resolve(link);
      expect(result).toEqual({
        fileName: 'Titan Station.blend',
        fileSizeBytes: 104857600,
      });
    });

    it('materializes verified Drive input to B2 before a B2-only Worker can claim it', async () => {
      const bytes = Buffer.concat([
        Buffer.from('BLENDER'),
        Buffer.from([45, 118, 50]),
      ]);
      fetchSpy
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              name: 'scene.blend',
              size: String(bytes.length),
            }),
        } as Response)
        .mockResolvedValueOnce(
          new Response(bytes, {
            headers: { 'content-length': String(bytes.length) },
          }),
        );

      await expect(
        serviceWithApiKey.materializeToB2(
          'https://drive.google.com/file/d/1vDKbOXoUbk7XwF7Y6xomDwdAzkPWPnyJ/view',
        ),
      ).resolves.toEqual({
        key: 'uploads/drive-project.blend',
        fileName: 'scene.blend',
        fileSizeBytes: bytes.length,
      });
      expect(b2Storage.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          originalname: 'scene.blend',
          size: bytes.length,
        }),
      );
    });

    it('Google Drive API lỗi khác 404 (vd 500/quota) -> KHÔNG chặn cứng, trả null thay vì bịa dữ liệu (không phải lỗi quyền, không nên hiện nhầm thông báo "kiểm tra quyền")', async () => {
      fetchSpy.mockResolvedValue({ ok: false, status: 500 } as Response);
      const link =
        'https://drive.google.com/file/d/1vDKbOXoUbk7XwF7Y6xomDwdAzkPWPnyJ/view';

      const result = await serviceWithApiKey.resolve(link);
      expect(result).toEqual({ fileName: null, fileSizeBytes: null });
    });
  });
});
