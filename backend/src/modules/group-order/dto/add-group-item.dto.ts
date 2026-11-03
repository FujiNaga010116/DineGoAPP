import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class AddGroupItemDto {
  @ApiProperty({
    example: 'member-uuid-123',
    description: 'ID người tham gia đặt món này',
  })
  @IsString({ message: 'memberId phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'memberId không được để trống' })
  memberId!: string;

  @ApiProperty({
    example: 'menu-item-uuid-123',
    description: 'ID món ăn trong thực đơn',
  })
  @IsString({ message: 'menuItemId phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'menuItemId không được để trống' })
  menuItemId!: string;

  @ApiProperty({
    example: 1,
    description: 'Số lượng phần ăn',
    default: 1,
  })
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng tối thiểu là 1' })
  quantity!: number;

  @ApiProperty({
    example: ['topping-uuid-1', 'topping-uuid-2'],
    description: 'Danh sách ID topping kèm theo',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'toppingIds phải là mảng chuỗi' })
  @IsString({ each: true, message: 'Mỗi toppingId phải là chuỗi' })
  toppingIds?: string[];

  @ApiProperty({
    example: 'Không hành, nhiều ớt',
    description: 'Ghi chú cho món ăn',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;
}

