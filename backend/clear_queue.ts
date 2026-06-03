import { Queue } from 'bullmq';
const analysisQueue = new Queue('analysis-queue', { connection: { host: 'localhost', port: 6379 } });
async function main() {
    await analysisQueue.obliterate();
    console.log("Queue obliterated!");
    process.exit(0);
}
main().catch(console.error);
