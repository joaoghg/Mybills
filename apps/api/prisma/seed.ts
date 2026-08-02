import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { DEFAULT_TRANSFER_CATEGORY } from '../src/modules/categories/constants/default-transfer-category';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to run the seed');
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const usersWithoutTransferCategory = await prisma.user.findMany({
    where: {
      categories: {
        none: {
          isSystem: true
        }
      }
    },
    select: { id: true }
  });

  for (const user of usersWithoutTransferCategory) {
    await prisma.category.create({
      data: {
        userId: user.id,
        name: DEFAULT_TRANSFER_CATEGORY.name,
        icon: DEFAULT_TRANSFER_CATEGORY.icon,
        isSystem: true
      }
    });
  }

  console.log(`Seeded transfer category for ${usersWithoutTransferCategory.length} user(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
