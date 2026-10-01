import { Test, TestingModule } from '@nestjs/testing';
import { BooksService } from './books.service';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../aws/s3.service';
import { SecureLinksService } from '../drm/secure-links.service';
import { BookAccessService } from '../common/book-access.service';

describe('BooksService', () => {
  let service: BooksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        {
          provide: PrismaService,
          useValue: {
            book: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              update: jest.fn(),
            },
            bookCategory: { findMany: jest.fn() },
            bookFormat: { findUnique: jest.fn() },
            borrowedBook: {
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: S3Service,
          useValue: { getPresignedDownloadUrl: jest.fn() },
        },
        {
          provide: SecureLinksService,
          useValue: { encryptPayload: jest.fn() },
        },
        {
          // getReadUrl authorizes through this before presigning anything.
          provide: BookAccessService,
          useValue: {
            assertCanRead: jest.fn().mockResolvedValue({
              id: 'book-1',
              tenantId: null,
              accessTier: 'FREE',
              drmProtected: false,
            }),
            assertCanReadSection: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BooksService>(BooksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
