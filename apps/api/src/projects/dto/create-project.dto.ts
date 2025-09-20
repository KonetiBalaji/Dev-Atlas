import { IsIn, IsString } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  handle!: string;

  @IsIn(['user', 'org'])
  type!: 'user' | 'org';

  @IsString()
  orgId!: string;
}
