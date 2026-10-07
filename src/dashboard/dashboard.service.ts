import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats() {
    // Total responden / surveyor / user di database
    const totalRegisteredUsers = await this.prisma.user.count();

    // Data user terbaru
    const recentUsers = await this.prisma.user.findMany({
      take: 4,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    // Recent activity yang relevan dengan InsightPoll (Survei, Opini Publik, GIS, Responden)
    const recentActivities = [
      {
        id: 'act-1',
        title: 'Survei Elektabilitas Pilkada Jawa Timur',
        action: 'batch 450 responden diverifikasi GIS',
        timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      },
      {
        id: 'act-2',
        title: 'Sentimen Isu Kebijakan Transportasi Publik',
        action: 'analisis AI mendeteksi sentimen positif 78.4%',
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      },
      {
        id: 'act-3',
        title: 'Cluster Wilayah Pemilih Mengambang (Undecided)',
        action: 'pembaruan polygon spasial zona Dapil III',
        timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      },
      {
        id: 'act-4',
        title: 'Laporan Riset Kepuasan Publik Sektor Kesehatan',
        action: 'dipublikasikan ke executive portal',
        timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
      },
      ...recentUsers.map((u) => ({
        id: u.id,
        title: u.name || u.email.split('@')[0],
        action: `bergabung sebagai verifikator riset (${u.role})`,
        timestamp: u.createdAt.toISOString(),
      })),
    ].slice(0, 6);

    return {
      stats: {
        totalSurveys: {
          label: 'Total Survei Aktif',
          value: '142',
          change: '+14 survei bulan ini',
        },
        verifiedRespondents: {
          label: 'Responden Terverifikasi',
          value: '48,250',
          change: '+12.5% validasi geolokasi',
        },
        spatialCoverage: {
          label: 'Cakupan Wilayah (Dapil / Kab)',
          value: '514 Kab/Kota',
          change: '98.2% sebaran presisi',
        },
        publicSentiment: {
          label: 'Indeks Sentimen Positif',
          value: '72.8%',
          change: '+4.3% dari pekan lalu',
        },
      },
      // Trend mingguan pengumpulan data survei & respon publik
      weeklyOverview: [
        { day: 'Sen', value: 65, respondents: '2,450', color: 'from-slate-700 to-slate-500' },
        { day: 'Sel', value: 85, respondents: '3,820', color: 'from-emerald-600 to-teal-400' },
        { day: 'Rab', value: 70, respondents: '3,100', color: 'from-cyan-600 to-blue-400' },
        { day: 'Kam', value: 95, respondents: '4,650', color: 'from-indigo-600 to-violet-400' },
        { day: 'Jum', value: 55, respondents: '2,200', color: 'from-amber-500 to-orange-400' },
      ],
      recentActivities,
    };
  }
}
