import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

@ApiTags('health')
@Controller()
export class AppController {
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check — returns API status' })
  health() {
    return {
      status: 'ok',
      service: 'esuuq-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
