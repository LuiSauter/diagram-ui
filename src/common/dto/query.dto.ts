import { Type } from "class-transformer";
import { IsEnum, IsOptional, IsPositive, IsString, Min } from "class-validator";
import { ORDER, ORDER_ENUM } from "../constants/order";

export class QueryDto {
  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @Min(0)
  @Type(() => Number)
  offset?: number;

  @IsOptional()
  @IsEnum(ORDER_ENUM)
  order?: ORDER;

  @IsString()
  @IsOptional()
  attr?: string;

  @IsOptional()
  value?: string;

  @IsOptional()
  id?: string;
}