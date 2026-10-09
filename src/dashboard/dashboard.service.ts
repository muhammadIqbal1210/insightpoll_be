import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats(currentUser?: { id: string; role: string; name?: string }) {
    // JIKA USER ADALAH EDITOR: Tampilkan dashboard khusus editor (Artikel miliknya, Publish, Draft, Views)
    if (currentUser?.role === 'EDITOR') {
      const editorId = currentUser.id;

      // 1. Artikel milik editor ini
      const totalPosts = await this.prisma.post.count({
        where: { authorId: editorId },
      });
      const publishedPosts = await this.prisma.post.count({
        where: { authorId: editorId, status: 'PUBLISHED' },
      });
      const draftPosts = await this.prisma.post.count({
        where: { authorId: editorId, status: 'DRAFT' },
      });

      // 2. Data views asli dari database
      const viewsAggregate = await (this.prisma as any).post.aggregate({
        where: { authorId: editorId },
        _sum: { views: true },
      });
      const totalViews = viewsAggregate._sum.views || 0;
      const avgReadTime = publishedPosts > 0 ? '3.5 mnt' : '0 mnt';

      // 3. Aktivitas artikel terbaru milik editor
      const myRecentPosts = await this.prisma.post.findMany({
        where: { authorId: editorId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          category: true,
          status: true,
          createdAt: true,
        },
      });

      const recentActivities = myRecentPosts.map((p) => ({
        id: `post-${p.id}`,
        title: p.title,
        action: `${p.status === 'PUBLISHED' ? 'Diterbitkan' : 'Disimpan draf'} pada kategori ${p.category}`,
        timestamp: p.createdAt.toISOString(),
      }));

      // 4. Hitung distribusi views 7 hari terakhir menggunakan tabel agregasi PostDailyView
      const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      const last7Days: { dateStr: string; day: string; views: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayLabel = dayNames[d.getDay()];
        const dateStr = d.toISOString().slice(0, 10);
        last7Days.push({ dateStr, day: dayLabel, views: 0 });
      }

      // Ambil data view harian dari PostDailyView untuk artikel milik editor
      const editorDailyStats = await (this.prisma as any).postDailyView.findMany({
        where: {
          date: { in: last7Days.map((d) => d.dateStr) },
          post: { authorId: editorId },
        },
        select: {
          date: true,
          views: true,
        },
      });

      // Petakan views harian ke masing-masing hari
      editorDailyStats.forEach((stat: { date: string; views: number }) => {
        const targetDay = last7Days.find((d) => d.dateStr === stat.date);
        if (targetDay) {
          targetDay.views += stat.views;
        }
      });

      const maxEditorViews = Math.max(...last7Days.map((d) => d.views), 10);
      const weeklyOverview = last7Days.map((d) => {
        const roundedViews = Math.round(d.views);
        const parts = d.dateStr.split('-');
        const dateFormatted = `${parts[2]}/${parts[1]}`; // DD/MM (contoh: 07/10)
        return {
          day: d.day,
          date: d.dateStr,
          dateFormatted,
          value: Math.round((roundedViews / maxEditorViews) * 100),
          respondents: `${roundedViews.toLocaleString('id-ID')} views`,
          views: roundedViews,
          color: 'from-teal-600 to-emerald-400',
        };
      });

      return {
        isEditor: true,
        stats: {
          totalSurveys: {
            label: 'Total Artikel Saya',
            value: totalPosts.toString(),
            change: `${publishedPosts} tayang, ${draftPosts} draf`,
          },
          verifiedRespondents: {
            label: 'Artikel Published',
            value: publishedPosts.toString(),
            change: `${Math.round(totalPosts > 0 ? (publishedPosts / totalPosts) * 100 : 0)}% dari total karya`,
          },
          spatialCoverage: {
            label: 'Draf Dalam Penulisan',
            value: draftPosts.toString(),
            change: 'Menunggu finalisasi',
          },
          publicSentiment: {
            label: 'Total Pembaca Artikel Saya',
            value: totalViews.toLocaleString('id-ID'),
            change: totalViews > 0 ? `${totalViews} total views` : 'Belum ada pembaca',
          },
        },
        weeklyOverview,
        recentActivities,
      };
    }

    // JIKA ADMIN: Tampilkan dashboard sistem menyeluruh (Rangkuman semua user)
    const totalUsers = await this.prisma.user.count({
      where: { deletedAt: null },
    });
    const totalAdmins = await this.prisma.user.count({
      where: { deletedAt: null, role: 'ADMIN' },
    });
    const totalEditors = await this.prisma.user.count({
      where: { deletedAt: null, role: 'EDITOR' },
    });

    const totalCategories = await (this.prisma as any).category.count();

    const totalPosts = await this.prisma.post.count();
    const publishedPosts = await this.prisma.post.count({
      where: { status: 'PUBLISHED' },
    });
    const draftPosts = await this.prisma.post.count({
      where: { status: 'DRAFT' },
    });

    // Total akumulasi views semua artikel di sistem
    const allViewsAggregate = await (this.prisma as any).post.aggregate({
      _sum: { views: true },
    });
    const totalSystemViews = allViewsAggregate._sum.views || 0;

    const recentUsers = await this.prisma.user.findMany({
      where: { deletedAt: null },
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    const recentPosts = await this.prisma.post.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        createdAt: true,
      },
    });

    const recentActivities = [
      ...recentPosts.map((p) => ({
        id: `post-${p.id}`,
        title: p.title,
        action: `artikel ${p.status === 'PUBLISHED' ? 'dipublikasikan' : 'disimpan draf'} di kategori ${p.category}`,
        timestamp: p.createdAt.toISOString(),
      })),
      ...recentUsers.map((u) => ({
        id: `user-${u.id}`,
        title: u.name || u.email.split('@')[0],
        action: `bergabung ke sistem sebagai ${u.role}`,
        timestamp: u.createdAt.toISOString(),
      })),
    ].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    ).slice(0, 6);

    const publishedRate = totalPosts > 0 ? Math.round((publishedPosts / totalPosts) * 100) : 0;

    // Hitung grafik views gabungan seluruh artikel semua user (7 hari terakhir) via PostDailyView
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const adminLast7Days: { dateStr: string; day: string; views: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayLabel = dayNames[d.getDay()];
      const dateStr = d.toISOString().slice(0, 10);
      adminLast7Days.push({ dateStr, day: dayLabel, views: 0 });
    }

    // Ambil data view harian gabungan seluruh artikel
    const allDailyStats = await (this.prisma as any).postDailyView.findMany({
      where: {
        date: { in: adminLast7Days.map((d) => d.dateStr) },
      },
      select: {
        date: true,
        views: true,
      },
    });

    allDailyStats.forEach((stat: { date: string; views: number }) => {
      const targetDay = adminLast7Days.find((d) => d.dateStr === stat.date);
      if (targetDay) {
        targetDay.views += stat.views;
      }
    });

    const maxAdminViews = Math.max(...adminLast7Days.map((d) => d.views), 10);
    const adminWeeklyOverview = adminLast7Days.map((d) => {
      const roundedViews = Math.round(d.views);
      const parts = d.dateStr.split('-');
      const dateFormatted = `${parts[2]}/${parts[1]}`; // DD/MM (contoh: 07/10)
      return {
        day: d.day,
        date: d.dateStr,
        dateFormatted,
        value: Math.round((roundedViews / maxAdminViews) * 100),
        respondents: `${roundedViews.toLocaleString('id-ID')} views`,
        views: roundedViews,
        color: 'from-slate-800 to-teal-500',
      };
    });

    return {
      isEditor: false,
      stats: {
        totalSurveys: {
          label: 'Total Artikel Riset',
          value: totalPosts.toString(),
          change: `${publishedPosts} tayang, ${draftPosts} draf`,
        },
        verifiedRespondents: {
          label: 'Pengguna Terdaftar',
          value: totalUsers.toString(),
          change: `${totalAdmins} Admin, ${totalEditors} Editor`,
        },
        spatialCoverage: {
          label: 'Kategori Topik Riset',
          value: `${totalCategories} Topik`,
          change: 'Taksonomi terkelola aktif',
        },
        publicSentiment: {
          label: 'Total Pembaca Seluruh Berita',
          value: totalSystemViews.toLocaleString('id-ID'),
          change: `${publishedRate}% rasio tayang`,
        },
      },
      weeklyOverview: adminWeeklyOverview,
      recentActivities,
    };
  }
}
