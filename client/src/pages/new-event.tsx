import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Calendar, MapPin, Clock, Loader2, ArrowRight } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";

const eventFormSchema = z.object({
  name: z.string().min(1, "اسم المناسبة مطلوب"),
  description: z.string().optional(),
  date: z.string().min(1, "تاريخ المناسبة مطلوب"),
  location: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

type EventFormData = z.infer<typeof eventFormSchema>;

export default function NewEventPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: "",
      description: "",
      date: "",
      location: "",
      startTime: "",
      endTime: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      const res = await apiRequest("POST", "/api/events", {
        ...data,
        date: new Date(data.date).toISOString(),
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "تم إنشاء المناسبة",
        description: "تم إنشاء المناسبة بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setLocation(`/events/${data.id}`);
    },
    onError: () => {
      toast({
        title: "فشل إنشاء المناسبة",
        description: "حدث خطأ أثناء إنشاء المناسبة",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EventFormData) => {
    createMutation.mutate(data);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/events">
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <ArrowRight className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">مناسبة جديدة</h1>
          <p className="text-muted-foreground">أنشئ مناسبة جديدة وابدأ بإضافة الضيوف</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-8"
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">اسم المناسبة *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        {...field}
                        placeholder="مثال: حفل زفاف أحمد وسارة"
                        className="glass-input pr-10 h-12 rounded-xl text-white placeholder:text-muted-foreground"
                        data-testid="input-event-name"
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">الوصف</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="وصف المناسبة..."
                      className="glass-input rounded-xl text-white placeholder:text-muted-foreground min-h-24 resize-none"
                      data-testid="input-event-description"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">التاريخ *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="date"
                      className="glass-input h-12 rounded-xl text-white"
                      data-testid="input-event-date"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">الموقع</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        {...field}
                        placeholder="مثال: فندق الريتز كارلتون، الرياض"
                        className="glass-input pr-10 h-12 rounded-xl text-white placeholder:text-muted-foreground"
                        data-testid="input-event-location"
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">وقت البداية</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          {...field}
                          type="time"
                          className="glass-input pr-10 h-12 rounded-xl text-white"
                          data-testid="input-event-start-time"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">وقت النهاية</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          {...field}
                          type="time"
                          className="glass-input pr-10 h-12 rounded-xl text-white"
                          data-testid="input-event-end-time"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-4 pt-6">
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1 h-12 gradient-primary text-white font-semibold rounded-xl glow-primary"
                data-testid="button-submit-event"
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin ml-2" />
                ) : (
                  <Calendar className="w-5 h-5 ml-2" />
                )}
                إنشاء المناسبة
              </Button>
              <Link href="/events">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 px-8 border-white/20 text-white hover:bg-white/10 rounded-xl"
                >
                  إلغاء
                </Button>
              </Link>
            </div>
          </form>
        </Form>
      </motion.div>
    </div>
  );
}
