import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InstitutionsService } from './institutions.service';

@Controller('institutions')
export class InstitutionsController {
  constructor(private readonly institutionsService: InstitutionsService) {}

  /**
   * GET /institutions/browse
   * Get all browseable institutions with optional filters
   */
  @Get('browse')
  @HttpCode(HttpStatus.OK)
  async getBrowseableInstitutions(
    @Query('type') type?: string,
    @Query('location') location?: string,
    @Query('search') search?: string,
  ) {
    return this.institutionsService.getBrowseableInstitutions({
      type,
      location,
      search,
    });
  }

  /**
   * GET /institutions/types
   * Get available institution types for filtering
   */
  @Get('types')
  @HttpCode(HttpStatus.OK)
  async getInstitutionTypes() {
    return this.institutionsService.getInstitutionTypes();
  }

  /**
   * GET /institutions/locations
   * Get available locations for filtering
   */
  @Get('locations')
  @HttpCode(HttpStatus.OK)
  async getInstitutionLocations() {
    return this.institutionsService.getInstitutionLocations();
  }

  /**
   * GET /institutions/:id
   * Get detailed information about a specific institution
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getInstitutionById(@Param('id') id: string) {
    return this.institutionsService.getInstitutionById(id);
  }
}
