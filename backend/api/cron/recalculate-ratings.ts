import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient as PostgresClient } from '../../src/generated/prisma-postgres';
import { MongoClient } from 'mongodb';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const pg = new PostgresClient();
  const mongo = new MongoClient(process.env.MONGODB_URI!);

  try {
    await mongo.connect();
    const aggregates = await mongo
      .db('shopsphere')
      .collection('reviews')
      .aggregate([
        { $group: { _id: '$productId', avgRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
      ])
      .toArray();

    let updated = 0;
    for (const agg of aggregates) {
      await pg.product.update({
        where: { id: agg._id },
        data: { avgRating: Math.round(agg.avgRating * 10) / 10, reviewCount: agg.reviewCount },
      });
      updated++;
    }

    return res.status(200).json({ success: true, productsUpdated: updated, ranAt: new Date().toISOString() });
  } catch (err) {
    console.error('Rating recalculation failed:', err);
    return res.status(500).json({ error: 'Job failed' });
  } finally {
    await pg.$disconnect();
    await mongo.close();
  }
}