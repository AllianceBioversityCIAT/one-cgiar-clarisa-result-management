import { Routes } from '@nestjs/core';
import { ClarisaResultModule } from './clarisa-result.module';

export const mainRoutes: Routes = [
  {
    path: 'api',
    children: [
      {
        path: 'results',
        module: ClarisaResultModule,
      },
    ],
  },
];
