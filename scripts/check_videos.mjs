import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    try {
        const videos = await prisma.generatedVideo.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10
        });
        console.log(`Found ${videos.length} videos.`);
        if (videos.length > 0) {
            console.table(videos.map(v => ({
                id: v.id.substring(0, 8) + '...',
                taskId: v.klingTaskId,
                status: v.status,
                prodId: v.productId,
                url: v.videoUrl ? 'YES' : 'NO'
            })));
        } else {
            console.log("No videos found in database.");
        }
    } catch (e) {
        console.error("Error connecting to DB:", e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
