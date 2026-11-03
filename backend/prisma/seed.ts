import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting DineGo Database Seeding (Sprint 1 Baseline - 4 Roles)...');

  const defaultPassword = 'DineGo@2026_SecurePass';
  const passwordHash = await bcryptjs.hash(defaultPassword, 10);

  // 1. Seed ADMIN User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@dinego.vn' },
    update: {},
    create: {
      email: 'admin@dinego.vn',
      fullName: 'Quản Trị Viên DineGo',
      phoneNumber: '0901000001',
      passwordHash,
      isEmailVerified: true,
      roles: {
        create: { role: 'ADMIN' },
      },
    },
  });
  console.log(`✅ Admin account seeded: ${admin.email}`);

  // 2. Seed MERCHANT User & Sample Restaurant
  const merchantUser = await prisma.user.upsert({
    where: { email: 'merchant@dinego.vn' },
    update: {},
    create: {
      email: 'merchant@dinego.vn',
      fullName: 'Chủ Quán Cơm Tấm Sài Gòn',
      phoneNumber: '0901000002',
      passwordHash,
      isEmailVerified: true,
      roles: {
        create: { role: 'MERCHANT' },
      },
    },
  });
  console.log(`✅ Merchant account seeded: ${merchantUser.email}`);

  // 3. Seed DRIVER / SHIPPER User
  const driverUser = await prisma.user.upsert({
    where: { email: 'driver@dinego.vn' },
    update: {},
    create: {
      email: 'driver@dinego.vn',
      fullName: 'Tài Xế Giao Hàng DineGo',
      phoneNumber: '0901000003',
      passwordHash,
      isEmailVerified: true,
      roles: {
        create: { role: 'DRIVER' },
      },
    },
  });
  console.log(`✅ Driver account seeded: ${driverUser.email}`);

  // 4. Seed CUSTOMER User
  const customerUser = await prisma.user.upsert({
    where: { email: 'customer@dinego.vn' },
    update: {},
    create: {
      email: 'customer@dinego.vn',
      fullName: 'Khách Hàng Thân Thiết',
      phoneNumber: '0901000004',
      passwordHash,
      isEmailVerified: true,
      roles: {
        create: { role: 'CUSTOMER' },
      },
    },
  });
  console.log(`✅ Customer account seeded: ${customerUser.email}`);

  // 5. Seed Sample Merchant Store: Cơm Tấm 1985
  const sampleMerchant = await prisma.merchant.upsert({
    where: { slug: 'com-tam-1985' },
    update: {},
    create: {
      ownerId: merchantUser.id,
      name: 'Cơm Tấm Sài Gòn 1985',
      slug: 'com-tam-1985',
      description: 'Cơm tấm sườn bì chả đặc biệt, hương vị truyền thống chuẩn Sài Gòn.',
      address: '123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
      phoneNumber: '0901000002',
      status: 'APPROVED',
      deliveryType: 'BOTH',
      isOpen: true,
      isActive: true,
      rating: 4.8,
    },
  });
  console.log(`✅ Sample restaurant seeded: ${sampleMerchant.name}`);

  // 6. Seed Category & Menu Items
  const mainCategory = await prisma.category.upsert({
    where: { id: 'cat-main-dishes-001' },
    update: {},
    create: {
      id: 'cat-main-dishes-001',
      merchantId: sampleMerchant.id,
      name: 'Món Chính Đặc Biệt',
      displayOrder: 1,
      isActive: true,
    },
  });

  const dish1 = await prisma.menuItem.upsert({
    where: { id: 'dish-com-tam-suon-001' },
    update: {},
    create: {
      id: 'dish-com-tam-suon-001',
      merchantId: sampleMerchant.id,
      categoryId: mainCategory.id,
      name: 'Cơm Tấm Sườn Cọng Nướng Than',
      description: 'Sườn cọng ướp mật ong đậm đà nướng than hoa thơm lừng.',
      price: 65000,
      isAvailable: true,
      preparationTime: 15,
    },
  });

  const topping1 = await prisma.topping.upsert({
    where: { id: 'top-trung-op-la-001' },
    update: {},
    create: {
      id: 'top-trung-op-la-001',
      merchantId: sampleMerchant.id,
      name: 'Thêm Trứng Ốp La Lòng Đào',
      price: 10000,
      isAvailable: true,
    },
  });

  await prisma.menuItemTopping.upsert({
    where: {
      menuItemId_toppingId: {
        menuItemId: dish1.id,
        toppingId: topping1.id,
      },
    },
    update: {},
    create: {
      menuItemId: dish1.id,
      toppingId: topping1.id,
    },
  });

  console.log('🎉 Seeding successfully finished!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

