import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME;

  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required for seeding.');
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
    },
    create: {
      email: adminEmail,
      name: adminName,
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  console.log(`\n🎉 Seed user berhasil!`);
  console.log(`Email    : ${user.email}`);
  console.log(`Password : ${adminPassword}\n`);

  // Seeder Kategori
  const categoriesData = [
    {
      name: 'Riset Politik & Elektoral',
      slug: 'riset-politik-dan-elektoral',
      description: 'Analisis elektabilitas, preferensi pemilih, dan dinamika pemilihan umum.',
    },
    {
      name: 'Survei Opini Publik',
      slug: 'survei-opini-publik',
      description: 'Pemetaan persepsi dan kepuasan masyarakat terhadap isu publik serta kebijakan pemerintah.',
    },
    {
      name: 'Spatial Intelligence',
      slug: 'spatial-intelligence',
      description: 'Analisis berbasis geospasial, GIS demografis, dan pemetaan wilayah strategis.',
    },
    {
      name: 'Kebijakan Publik',
      slug: 'kebijakan-publik',
      description: 'Kajian mendalam terhadap perumusan, implementasi, dan dampak kebijakan publik.',
    },
    {
      name: 'Riset Pasar & Konsumen',
      slug: 'riset-pasar-dan-konsumen',
      description: 'Studi tren konsumen, perilaku pasar, dan intelijen bisnis kompetitif.',
    },
    {
      name: 'Berita & Analisis',
      slug: 'berita-dan-analisis',
      description: 'Kabar terkini, liputan kegiatan, dan artikel opini analitis.',
    },
  ];

  console.log('🌱 Melakukan seeding Kategori...');
  for (const cat of categoriesData) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
      },
    });
  }
  console.log(`✅ ${categoriesData.length} Kategori berhasil disemai.`);

  // Seeder Tags
  const tagsData = [
    { name: 'Pilkada 2024', slug: 'pilkada-2024' },
    { name: 'Elektabilitas', slug: 'elektabilitas' },
    { name: 'Survei Kepuasan', slug: 'survei-kepuasan' },
    { name: 'Big Data', slug: 'big-data' },
    { name: 'GIS Mapping', slug: 'gis-mapping' },
    { name: 'Demografi Pemilih', slug: 'demografi-pemilih' },
    { name: 'Kebijakan Publik', slug: 'kebijakan-publik' },
    { name: 'Sentimen Media', slug: 'sentimen-media' },
    { name: 'Ekonomi & Pasar', slug: 'ekonomi-dan-pasar' },
    { name: 'Perilaku Konsumen', slug: 'perilaku-konsumen' },
    { name: 'Demokrasi', slug: 'demokrasi' },
    { name: 'Metodologi Riset', slug: 'metodologi-riset' },
  ];

  console.log('🌱 Melakukan seeding Tags...');
  for (const tag of tagsData) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {
        name: tag.name,
      },
      create: {
        name: tag.name,
        slug: tag.slug,
      },
    });
  }
  console.log(`✅ ${tagsData.length} Tags berhasil disemai.\n`);
}

main()
  .catch((e) => {
    console.error('Error saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
