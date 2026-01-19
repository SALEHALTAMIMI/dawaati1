import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CreditCard, 
  Users, 
  Calendar, 
  Package, 
  ChevronDown, 
  ChevronUp,
  Edit3,
  Check,
  X,
  UserCheck,
  UserX,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface TierUsage {
  tierId: string;
  tierName: string;
  eventCount: number;
  guestCount: number;
}

interface Subscription {
  id: string;
  name: string;
  username: string;
  isActive: boolean;
  eventQuota: number;
  eventsUsed: number;
  eventsRemaining: number;
  totalGuests: number;
  tierUsage: TierUsage[];
  createdAt: string;
}

export default function SubscriptionsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuota, setEditQuota] = useState<number>(0);
  const { toast } = useToast();

  const { data: subscriptions = [], isLoading } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
  });

  const updateQuotaMutation = useMutation({
    mutationFn: async ({ id, eventQuota }: { id: string; eventQuota: number }) => {
      const res = await apiRequest("PATCH", `/api/subscriptions/${id}/quota`, { eventQuota });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "تم التحديث",
        description: "تم تحديث حصة مدير المناسبات بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setEditingId(null);
    },
    onError: () => {
      toast({
        title: "فشل التحديث",
        description: "حدث خطأ أثناء تحديث الحصة",
        variant: "destructive",
      });
    },
  });

  const handleStartEdit = (sub: Subscription) => {
    setEditingId(sub.id);
    setEditQuota(sub.eventQuota);
  };

  const handleSaveQuota = (id: string) => {
    updateQuotaMutation.mutate({ id, eventQuota: editQuota });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditQuota(0);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const totalManagers = subscriptions.length;
  const activeManagers = subscriptions.filter(s => s.isActive).length;
  const totalEvents = subscriptions.reduce((sum, s) => sum + s.eventsUsed, 0);
  const totalGuests = subscriptions.reduce((sum, s) => sum + s.totalGuests, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">إدارة الاشتراكات</h1>
        <p className="text-muted-foreground">تتبع حصص مديري المناسبات واستخدامهم</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl gradient-primary">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">مديرو المناسبات</p>
                <p className="text-2xl font-bold text-white" data-testid="text-total-managers">{totalManagers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/20">
                <UserCheck className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">نشطين</p>
                <p className="text-2xl font-bold text-white" data-testid="text-active-managers">{activeManagers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/20">
                <Calendar className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">إجمالي المناسبات</p>
                <p className="text-2xl font-bold text-white" data-testid="text-total-events">{totalEvents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-500/20">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">إجمالي الضيوف</p>
                <p className="text-2xl font-bold text-white" data-testid="text-total-guests">{totalGuests}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {subscriptions.length === 0 ? (
          <Card className="glass-card border-white/10">
            <CardContent className="p-12 text-center">
              <CreditCard className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">لا يوجد مديرو مناسبات</h3>
              <p className="text-muted-foreground">قم بإضافة مديري مناسبات من صفحة "مديرو المناسبات"</p>
            </CardContent>
          </Card>
        ) : (
          subscriptions.map((sub, index) => {
            const usagePercentage = sub.eventQuota > 0 
              ? Math.round((sub.eventsUsed / sub.eventQuota) * 100) 
              : 0;
            const isExhausted = sub.eventsRemaining === 0 && sub.eventQuota > 0;
            const isLow = sub.eventsRemaining <= 2 && sub.eventsRemaining > 0;
            const isExpanded = expandedId === sub.id;
            const isEditing = editingId === sub.id;

            return (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className={`glass-card border-white/10 overflow-hidden ${
                    isExhausted ? "border-red-500/30" : isLow ? "border-yellow-500/30" : ""
                  }`}
                  data-testid={`card-subscription-${sub.id}`}
                >
                  <CardContent className="p-0">
                    <div 
                      className="p-6 cursor-pointer hover:bg-white/5 transition-colors"
                      onClick={() => !isEditing && toggleExpand(sub.id)}
                    >
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            sub.isActive ? "gradient-primary" : "bg-gray-500/20"
                          }`}>
                            <span className="text-white font-bold text-lg">{sub.name.charAt(0)}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-white font-bold text-lg" data-testid={`text-manager-name-${sub.id}`}>
                                {sub.name}
                              </h3>
                              {!sub.isActive && (
                                <Badge variant="secondary" className="bg-gray-500/20 text-gray-400">
                                  معلق
                                </Badge>
                              )}
                            </div>
                            <p className="text-muted-foreground text-sm">@{sub.username}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 flex-wrap">
                          <div className="text-center">
                            <p className="text-muted-foreground text-xs mb-1">المناسبات</p>
                            <div className="flex items-center gap-1">
                              <span className="text-white font-bold" data-testid={`text-events-used-${sub.id}`}>
                                {sub.eventsUsed}
                              </span>
                              <span className="text-muted-foreground">/</span>
                              {isEditing ? (
                                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                  <Input
                                    type="number"
                                    value={editQuota}
                                    onChange={(e) => setEditQuota(parseInt(e.target.value) || 0)}
                                    className="w-16 h-8 text-center"
                                    min={0}
                                    data-testid={`input-quota-${sub.id}`}
                                  />
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-green-400 hover:text-green-300"
                                    onClick={() => handleSaveQuota(sub.id)}
                                    disabled={updateQuotaMutation.isPending}
                                    data-testid={`button-save-quota-${sub.id}`}
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-red-400 hover:text-red-300"
                                    onClick={handleCancelEdit}
                                    data-testid={`button-cancel-quota-${sub.id}`}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <span className={`font-bold ${
                                    isExhausted ? "text-red-400" : isLow ? "text-yellow-400" : "text-primary"
                                  }`} data-testid={`text-quota-${sub.id}`}>
                                    {sub.eventQuota}
                                  </span>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-muted-foreground hover:text-white"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartEdit(sub);
                                    }}
                                    data-testid={`button-edit-quota-${sub.id}`}
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="text-center">
                            <p className="text-muted-foreground text-xs mb-1">الضيوف</p>
                            <p className="text-white font-bold" data-testid={`text-guests-${sub.id}`}>
                              {sub.totalGuests}
                            </p>
                          </div>

                          <div className="w-32">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">الاستخدام</span>
                              <span className={`font-medium ${
                                isExhausted ? "text-red-400" : isLow ? "text-yellow-400" : "text-primary"
                              }`}>
                                {usagePercentage}%
                              </span>
                            </div>
                            <Progress 
                              value={usagePercentage} 
                              className={`h-2 ${
                                isExhausted ? "[&>div]:bg-red-500" : isLow ? "[&>div]:bg-yellow-500" : ""
                              }`}
                            />
                          </div>

                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-muted-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(sub.id);
                            }}
                            data-testid={`button-expand-${sub.id}`}
                          >
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-6 border-t border-white/10 pt-4">
                            <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                              <Package className="w-4 h-4" />
                              استخدام الباقات
                            </h4>
                            
                            {sub.tierUsage.length === 0 ? (
                              <p className="text-muted-foreground text-sm">لم يقم بإنشاء أي مناسبات بعد</p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {sub.tierUsage.map((tier, i) => (
                                  <div 
                                    key={tier.tierId}
                                    className="glass rounded-xl p-4"
                                    data-testid={`tier-usage-${sub.id}-${i}`}
                                  >
                                    <div className="flex items-center gap-3 mb-3">
                                      <div className="p-2 rounded-lg bg-primary/20">
                                        <Package className="w-4 h-4 text-primary" />
                                      </div>
                                      <span className="text-white font-medium">{tier.tierName}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <p className="text-muted-foreground">المناسبات</p>
                                        <p className="text-white font-bold">{tier.eventCount}</p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground">الضيوف</p>
                                        <p className="text-white font-bold">{tier.guestCount}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
