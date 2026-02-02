import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const images = await prisma.generatedImage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('Recent Images:', JSON.stringify(images, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
