import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, Save, Loader2, MessageCircle } from "lucide-react";
import { SiWhatsapp, SiInstagram, SiFacebook, SiX, SiLinkedin } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";

interface SiteSettings {
  whatsapp?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  twitter?: string | null;
  linkedin?: string | null;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>({
    whatsapp: "",
    instagram: "",
    facebook: "",
    twitter: "",
    linkedin: "",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/settings", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setSettings({
          whatsapp: data.whatsapp || "",
          instagram: data.instagram || "",
          facebook: data.facebook || "",
          twitter: data.twitter || "",
          linkedin: data.linkedin || "",
        });
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast({
          title: "تم الحفظ",
          description: "تم حفظ إعدادات الموقع بنجاح",
        });
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في حفظ الإعدادات",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (user?.role !== "super_admin") {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <Card className="glass-card border-white/10 text-center p-8">
            <CardContent>
              <Settings className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">غير مصرح</h2>
              <p className="text-muted-foreground">هذه الصفحة متاحة لمالك النظام فقط</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl gradient-primary glow-primary">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">إعدادات الموقع</h1>
              <p className="text-muted-foreground">إدارة روابط التواصل الاجتماعي</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Card className="glass-card border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  روابط التواصل الاجتماعي
                </CardTitle>
                <CardDescription>
                  أضف روابط التواصل الاجتماعي لعرضها في صفحة تسجيل الدخول
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-white/90 flex items-center gap-2">
                    <SiWhatsapp className="w-5 h-5 text-green-500" />
                    واتساب
                  </Label>
                  <Input
                    value={settings.whatsapp || ""}
                    onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                    placeholder="مثال: https://wa.me/966500000000"
                    className="glass-input text-white placeholder:text-muted-foreground border-white/10"
                    dir="ltr"
                    data-testid="input-whatsapp"
                  />
                  <p className="text-xs text-muted-foreground">أدخل رابط واتساب أو رقم الهاتف بصيغة wa.me</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/90 flex items-center gap-2">
                    <SiInstagram className="w-5 h-5 text-pink-500" />
                    انستغرام
                  </Label>
                  <Input
                    value={settings.instagram || ""}
                    onChange={(e) => setSettings({ ...settings, instagram: e.target.value })}
                    placeholder="مثال: https://instagram.com/username"
                    className="glass-input text-white placeholder:text-muted-foreground border-white/10"
                    dir="ltr"
                    data-testid="input-instagram"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white/90 flex items-center gap-2">
                    <SiFacebook className="w-5 h-5 text-blue-500" />
                    فيسبوك
                  </Label>
                  <Input
                    value={settings.facebook || ""}
                    onChange={(e) => setSettings({ ...settings, facebook: e.target.value })}
                    placeholder="مثال: https://facebook.com/pagename"
                    className="glass-input text-white placeholder:text-muted-foreground border-white/10"
                    dir="ltr"
                    data-testid="input-facebook"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white/90 flex items-center gap-2">
                    <SiX className="w-5 h-5 text-white" />
                    إكس (تويتر سابقاً)
                  </Label>
                  <Input
                    value={settings.twitter || ""}
                    onChange={(e) => setSettings({ ...settings, twitter: e.target.value })}
                    placeholder="مثال: https://x.com/username"
                    className="glass-input text-white placeholder:text-muted-foreground border-white/10"
                    dir="ltr"
                    data-testid="input-twitter"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white/90 flex items-center gap-2">
                    <SiLinkedin className="w-5 h-5 text-blue-600" />
                    لينكدإن
                  </Label>
                  <Input
                    value={settings.linkedin || ""}
                    onChange={(e) => setSettings({ ...settings, linkedin: e.target.value })}
                    placeholder="مثال: https://linkedin.com/in/username"
                    className="glass-input text-white placeholder:text-muted-foreground border-white/10"
                    dir="ltr"
                    data-testid="input-linkedin"
                  />
                </div>

                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full gradient-primary text-white glow-primary"
                  data-testid="button-save-settings"
                >
                  {isSaving ? (
                    <Loader2 className="w-5 h-5 animate-spin ml-2" />
                  ) : (
                    <Save className="w-5 h-5 ml-2" />
                  )}
                  حفظ الإعدادات
                </Button>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </Layout>
  );
}
