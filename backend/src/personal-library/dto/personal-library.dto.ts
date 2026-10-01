import {
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  IsBoolean,
  IsArray,
  ArrayNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PresignUploadDto {
  @IsString()
  filename: string;

  @IsString()
  @IsIn(['application/pdf', 'application/epub+zip'])
  mimeType: string;

  @IsNumber()
  fileSize: number;
}

export class ConfirmUploadDto {
  @IsString()
  storageKey: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsString()
  @IsIn(['pdf', 'epub'])
  format: string;

  @IsString()
  @IsIn(['application/pdf', 'application/epub+zip'])
  mimeType: string;

  @IsNumber()
  fileSize: number;

  @IsOptional()
  @IsString()
  folderId?: string; // Optional target folder via presign drop
}

export class UpdateFileDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsString()
  folderId?: string | null;

  @IsOptional()
  @IsBoolean()
  isStarred?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  color?: string | null;
}

export class CreateFolderDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsBoolean()
  isStarred?: boolean;
}

export class UpdateFolderDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsOptional()
  @IsString()
  color?: string | null;

  @IsOptional()
  @IsBoolean()
  isStarred?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class BulkActionDto {
  @IsString()
  @IsIn(['move', 'star', 'unstar', 'delete', 'update-tags'])
  action: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fileIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  folderIds?: string[];

  @IsOptional()
  @IsString()
  targetFolderId?: string | null; // For 'move'

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagsToAdd?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagsToRemove?: string[];
}

export class SyncProgressDto {
  @IsNumber()
  currentPage: number;

  @IsNumber()
  percentComplete: number;

  @IsOptional()
  @IsNumber()
  timeSpentSeconds?: number;

  @IsOptional()
  @IsNumber()
  totalPagesRead?: number;

  @IsOptional()
  bookmarks?: any[];

  @IsOptional()
  readerSettings?: any;
}
