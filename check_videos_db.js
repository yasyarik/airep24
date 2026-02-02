import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const videos = await prisma.generatedVideo.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log('Recent Generated Videos:', JSON.stringify(videos, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
