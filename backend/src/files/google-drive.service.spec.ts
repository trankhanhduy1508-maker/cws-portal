import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { GoogleDriveService } from './google-drive.service';

describe('GoogleDriveService', () => {
  let service: GoogleDriveService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleDriveService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(null) }, // không cấu hình API key
        },
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
    it('chấp nhận link dạng /file/d/<id>/view', async () => {
      const result = await service.resolve(
        'https://drive.google.com/file/d/1vDKbOXoUbk7XwF7Y6xomDwdAzkPWPnyJ/view?usp=drivesdk',
      );
      // Không có API key -> honest fallback null, không bịa dữ liệu giả
      expect(result).toEqual({ fileName: null, fileSizeBytes: null });
    });

    it('chấp nhận link dạng ?id=<id>', async () => {
      const result = await service.resolve(
        'https://drive.google.com/open?id=1vDKbOXoUbk7XwF7Y6xomDwdAzkPWPnyJ',
      );
      expect(result).toEqual({ fileName: null, fileSizeBytes: null });
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

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GoogleDriveService,
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue('fake-api-key') },
          },
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

    it('Google Drive API lỗi khác 404 (vd 500/quota) -> KHÔNG chặn cứng, trả null thay vì bịa dữ liệu (không phải lỗi quyền, không nên hiện nhầm thông báo "kiểm tra quyền")', async () => {
      fetchSpy.mockResolvedValue({ ok: false, status: 500 } as Response);
      const link =
        'https://drive.google.com/file/d/1vDKbOXoUbk7XwF7Y6xomDwdAzkPWPnyJ/view';

      const result = await serviceWithApiKey.resolve(link);
      expect(result).toEqual({ fileName: null, fileSizeBytes: null });
    });
  });
});
