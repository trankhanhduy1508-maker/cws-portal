import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { FilesModule } from '../files/files.module';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OutputsController } from './outputs.controller';
import { OutputsRepository } from './outputs.repository';
import { OutputsService } from './outputs.service';
@Module({imports:[SupabaseModule,FilesModule],controllers:[OutputsController],providers:[OutputsRepository,OutputsService,JwtAuthGuard],exports:[OutputsService]})
export class OutputsModule {}
