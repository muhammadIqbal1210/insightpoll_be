import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function syncCategories() {
  console.log('🔄 Memulai sinkronisasi artikel dengan kategori...');

  const categories = await prisma.category.findMany();
  console.log(`Ditemukan ${categories.length} kategori dalam database:`);
  categories.forEach((c) => console.log(` - [${c.id}] ${c.name} (${c.slug})`));

  const posts = await prisma.post.findMany();
  console.log(`\nDitemukan ${posts.length} artikel total.`);

  let updatedCount = 0;

  for (const post of posts) {
    let matchedCategory = null;

    // 1. Cek jika sudah punya categoryId yang valid
    if (post.categoryId) {
      matchedCategory = categories.find((c) => c.id === post.categoryId);
    }

    // 2. Jika belum cocok, cari berdasarkan kesamaan nama kategori
    if (!matchedCategory && post.category) {
      const rawPostCat = post.category.trim().toLowerCase();
      matchedCategory = categories.find(
        (c) =>
          c.name.trim().toLowerCase() === rawPostCat ||
          c.slug.trim().toLowerCase() === slugify(rawPostCat)
      );
    }

    // 3. Jika masih belum cocok, coba fuzzy match / mapping kategori umum
    if (!matchedCategory && post.category) {
      const rawLower = post.category.toLowerCase();
      if (rawLower.includes('politik') || rawLower.includes('elektoral')) {
        matchedCategory = categories.find((c) => c.slug.includes('politik') || c.name.includes('Politik'));
      } else if (rawLower.includes('survei') || rawLower.includes('opini')) {
        matchedCategory = categories.find((c) => c.slug.includes('opini') || c.name.includes('Survei'));
      } else if (rawLower.includes('spasial') || rawLower.includes('spatial') || rawLower.includes('gis')) {
        matchedCategory = categories.find((c) => c.slug.includes('spatial') || c.name.includes('Spatial'));
      } else if (rawLower.includes('kebijakan')) {
        matchedCategory = categories.find((c) => c.slug.includes('kebijakan') || c.name.includes('Kebijakan'));
      } else if (rawLower.includes('pasar') || rawLower.includes('konsumen')) {
        matchedCategory = categories.find((c) => c.slug.includes('pasar') || c.name.includes('Pasar'));
      } else if (rawLower.includes('berita') || rawLower.includes('analisis') || rawLower.includes('riset')) {
        matchedCategory = categories.find((c) => c.slug.includes('berita') || c.name.includes('Berita'));
      }
    }

    // 4. Jika masih tidak ada, fallback ke kategori pertama jika ada
    if (!matchedCategory && categories.length > 0) {
      matchedCategory = categories[0];
    }

    if (matchedCategory) {
      const needUpdate = post.categoryId !== matchedCategory.id || post.category !== matchedCategory.name;
      if (needUpdate) {
        await prisma.post.update({
          where: { id: post.id },
          data: {
            categoryId: matchedCategory.id,
            category: matchedCategory.name,
          },
        });
        console.log(`✅ [Updated] "${post.title.substring(0, 40)}..." -> [${matchedCategory.name}]`);
        updatedCount++;
      } else {
        console.log(`ℹ️ [Sudah Cocok] "${post.title.substring(0, 40)}..." -> [${matchedCategory.name}]`);
      }
    } else {
      console.log(`⚠️ Tidak dapat mencocokkan kategori untuk: "${post.title}"`);
    }
  }

  console.log(`\n🎉 Selesai! Sebanyak ${updatedCount} artikel berhasil diperbarui relasi kategorinya.`);
}

syncCategories()
  .catch((e) => {
    console.error('❌ Gagal sinkronisasi kategori:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
