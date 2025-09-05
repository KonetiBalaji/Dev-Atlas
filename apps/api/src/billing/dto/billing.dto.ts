// DevAtlas Billing DTOs
// Created by Balaji Koneti

import { IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCheckoutSessionDto {
  @ApiProperty({ description: 'Stripe price ID' })
  @IsString()
  priceId!: string;

  @ApiProperty({ description: 'Success URL' })
  @IsUrl()
  successUrl!: string;

  @ApiProperty({ description: 'Cancel URL' })
  @IsUrl()
  cancelUrl!: string;
}

export class CreateCustomerPortalDto {
  @ApiProperty({ description: 'Return URL' })
  @IsUrl()
  returnUrl!: string;
}
