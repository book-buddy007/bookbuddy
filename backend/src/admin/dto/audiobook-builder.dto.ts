import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AudioSectionType } from '@prisma/client';

export class CreateChapterDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsEnum(AudioSectionType)
  @IsOptional()
  type?: AudioSectionType;
}

export class UpdateChapterDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsEnum(AudioSectionType)
  @IsOptional()
  type?: AudioSectionType;
}

export class CreateSectionDto {
  @IsString()
  @IsOptional()
  title?: string;
}

export class UpdateSectionDto {
  @IsString()
  @IsOptional()
  title?: string;
}

export class ReorderItemDto {
  @IsString()
  id: string;

  @IsInt()
  sortOrder: number;
}

export class ReorderStructureDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  chapters: ReorderItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  sections: ReorderItemDto[];
}
