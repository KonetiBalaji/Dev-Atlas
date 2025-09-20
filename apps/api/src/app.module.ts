import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { QueueModule } from './queue/queue.module';
import { AiApiModule } from './ai/ai.api.module';
import { ProjectsModule } from './projects/projects.module';
import { UsersModule } from './users/users.module';
import { OrgsModule } from './orgs/orgs.module';
import { PrismaModule } from './prisma/prisma.module';
import { AnalysesModule } from './analyses/analyses.module';
import { ReposModule } from './repos/repos.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    PrismaModule,
    OrgsModule,
    UsersModule,
    ProjectsModule,
    AnalysesModule,
    ReposModule,
    SearchModule,
    AiApiModule,
    QueueModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
