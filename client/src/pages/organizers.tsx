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
});

type UserFormData = z.infer<typeof userFormSchema>;

export default function OrganizersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: organizers = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users/organizers"],
  });

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      username: "",
      password: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const res = await apiRequest("POST", "/api/users", {
        ...data,
        role: "organizer",
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "تم إنشاء الحساب",
        description: "تم إنشاء حساب المنظم بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users/organizers"] });
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

  const filteredOrganizers = organizers.filter((org) =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    { key: "name", header: "الاسم" },
    { key: "username", header: "اسم المستخدم" },
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
    {
      key: "createdAt",
      header: "تاريخ الإنشاء",
      render: (user: User) =>
        user.createdAt
          ? new Date(user.createdAt).toLocaleDateString("ar-SA")
          : "-",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">فريق العمل</h1>
          <p className="text-muted-foreground">إدارة المنظمين وموظفي البوابات</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary glow-primary" data-testid="button-add-organizer">
              <Plus className="w-5 h-5 ml-2" />
              إضافة منظم
            </Button>
          </DialogTrigger>
          <DialogContent className="glass border-white/10 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white text-xl">إضافة منظم جديد</DialogTitle>
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
                          data-testid="input-organizer-name"
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
                          data-testid="input-organizer-username"
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
                          data-testid="input-organizer-password"
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
                  data-testid="button-submit-organizer"
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
          placeholder="ابحث عن منظم..."
          className="glass-input pr-12 h-12 rounded-xl text-white placeholder:text-muted-foreground"
          data-testid="input-search-organizers"
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredOrganizers}
        isLoading={isLoading}
        emptyMessage="لا يوجد منظمون"
      />
    </div>
  );
}
