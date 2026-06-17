const { PrismaClient } = require('@prisma/client');
const { logger } = require('./logger');

const prisma = new PrismaClient();

// Connect immediately to catch any misconfigured DATABASE_URL on startup
prisma.$connect()
  .then(() => {
    logger.info('Prisma Client connected to database successfully.');
  })
  .catch((err) => {
    logger.error('Prisma Client failed to connect to database', { error: err.message });
  });

module.exports = { prisma };
