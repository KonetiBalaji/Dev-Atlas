import { Controller, Post, Body } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  search(@Body() searchDto: { query: string; limit?: number }) {
    return this.searchService.search(searchDto.query, searchDto.limit || 5);
  }
}
