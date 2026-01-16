import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Calendar, Users, UserCheck, Clock, Plus, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { StatsCard } from "@/components/stats-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Event } from "@shared/schema";

export function EventManagerDashboard() {
  const { data: stats } = useQuery<{
    totalEvents: number;
    activeEvents: number;
    totalGuests: number;
    checkedInToday: number;
  }>({
    queryKey: ["/api/stats/event-manager"],
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const upcomingEvents = events.filter(e => new Date(e.date) >= new Date()).slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">غرفة القيادة</h1>
          <p className="text-muted-foreground">إدارة مناسباتك وفريق العمل</p>
        </div>
        <Link href="/events/new">
          <Button className="gradient-primary glow-primary" data-testid="button-new-event">
            <Plus className="w-5 h-5 ml-2" />
            مناسبة جديدة
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="المناسبات"
          value={stats?.totalEvents ?? 0}
          icon={Calendar}
          description="إجمالي مناسباتك"
          delay={0}
        />
        <StatsCard
          title="المناسبات النشطة"
          value={stats?.activeEvents ?? 0}
          icon={Clock}
          description="تجري الآن"
          delay={0.1}
        />
        <StatsCard
          title="الضيوف"
          value={stats?.totalGuests ?? 0}
          icon={Users}
          description="إجمالي المدعوين"
          delay={0.2}
        />
        <StatsCard
          title="تسجيل اليوم"
          value={stats?.checkedInToday ?? 0}
          icon={UserCheck}
          description="حضروا اليوم"
          delay={0.3}
        />
      </div>

      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">المناسبات القادمة</h2>
          <Link href="/events">
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
              عرض الكل
              <ArrowLeft className="w-4 h-4 mr-2" />
            </Button>
          </Link>
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لا توجد مناسبات قادمة</p>
            <Link href="/events/new">
              <Button variant="outline" className="mt-4">
                <Plus className="w-4 h-4 ml-2" />
                أنشئ مناسبة جديدة
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={`/events/${event.id}`}>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-medium">{event.name}</h3>
                        <p className="text-muted-foreground text-sm">
                          {new Date(event.date).toLocaleDateString("ar-SA")}
                          {event.location && ` • ${event.location}`}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-primary/20 text-primary border-none">
                      {event.isActive ? "نشط" : "غير نشط"}
                    </Badge>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
