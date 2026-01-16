import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Users, Plus, Search, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";

const userFormSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  username: z.string().min(3, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  eventQuota: z.number().min(1, "الحد الأدنى هو 1").max(100, "الحد الأقصى هو 100"),
});

type UserFormData = z.infer<typeof userFormSchema>;

export default function EventManagersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: eventManagers = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users/event-managers"],
  });

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      username: "",
      password: "",
      eventQuota: 5,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const res = await apiRequest("POST", "/api/users", {
        ...data,
        role: "event_manager",
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "تم إنشاء الحساب",
        description: "تم إنشاء حساب مدير المناسبات بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users/event-managers"] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "فشل إنشاء الحساب",
        description: "اسم المستخدم قد يكون مستخدماً مسبقاً",
        variant: "destructive",
      });
    },
  });

  const filteredManagers = eventManagers.filter((manager) =>
    manager.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    manager.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    { key: "name", header: "الاسم" },
    { key: "username", header: "اسم المستخدم" },
    {
      key: "eventQuota",
      header: "الحصة",
      render: (user: User) => (
        <Badge variant="secondary" className="bg-primary/20 text-primary">
          {user.eventQuota} مناسبات
        </Badge>
      ),
    },
    {
      key: "isActive",
      header: "الحالة",
      render: (user: User) => (
        <Badge
          variant="secondary"
          className={`${
            user.isActive
              ? "bg-green-500/20 text-green-400"
              : "bg-gray-500/20 text-gray-400"
          }`}
        >
          {user.isActive ? "نشط" : "غير نشط"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">مديرو المناسبات</h1>
          <p className="text-muted-foreground">إدارة عملاء ومديري المناسبات</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary glow-primary" data-testid="button-add-event-manager">
              <Plus className="w-5 h-5 ml-2" />
              إضافة عميل
            </Button>
          </DialogTrigger>
          <DialogContent className="glass border-white/10 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white text-xl">إضافة مدير مناسبات</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">الاسم الكامل</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="أدخل الاسم الكامل"
                          className="glass-input h-12 rounded-xl text-white placeholder:text-muted-foreground"
                          data-testid="input-manager-name"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">اسم المستخدم</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="أدخل اسم المستخدم"
                          className="glass-input h-12 rounded-xl text-white placeholder:text-muted-foreground"
                          data-testid="input-manager-username"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">كلمة المرور</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="أدخل كلمة المرور"
                          className="glass-input h-12 rounded-xl text-white placeholder:text-muted-foreground"
                          data-testid="input-manager-password"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="eventQuota"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">حصة المناسبات</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min={1}
                          max={100}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          className="glass-input h-12 rounded-xl text-white placeholder:text-muted-foreground"
                          data-testid="input-manager-quota"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="w-full h-12 gradient-primary"
                  data-testid="button-submit-manager"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin ml-2" />
                  ) : (
                    <Users className="w-5 h-5 ml-2" />
                  )}
                  إنشاء الحساب
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث عن مدير مناسبات..."
          className="glass-input pr-12 h-12 rounded-xl text-white placeholder:text-muted-foreground"
          data-testid="input-search-managers"
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredManagers}
        isLoading={isLoading}
        emptyMessage="لا يوجد مديرو مناسبات"
      />
    </div>
  );
}
