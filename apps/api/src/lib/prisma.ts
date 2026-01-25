import "dotenv/config";
import { PrismaPg } from '@prisma/adapter-pg';
import { createRequire } from 'module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const generatedClientPath = path.resolve(process.cwd(), 'src/generated/prisma');
const { PrismaClient } = require(generatedClientPath);

const connectionString = process.env.DATABASE_URL ?? '';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export { prisma };
