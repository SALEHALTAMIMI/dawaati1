import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { randomUUID, createHash } from "crypto";
import { insertUserSchema, insertEventSchema } from "@shared/schema";
import multer from "multer";
import * as XLSX from "xlsx";

const upload = multer({ storage: multer.memoryStorage() });

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

// Password hashing utility
function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

// Auth middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "غير مصرح" });
  }
  next();
}

// Role-based access control middleware
function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "غير مصرح" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: "غير مسموح" });
    }
    (req as any).user = user;
    next();
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Session setup
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "event-management-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "بيانات ناقصة" });
      }

      const user = await storage.getUserByUsername(username);
      const hashedPassword = hashPassword(password);
      
      if (!user || user.password !== hashedPassword) {
        return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: "الحساب غير مفعل" });
      }

      req.session.userId = user.id;
      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      res.status(500).json({ error: "خطأ في الخادم" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "فشل تسجيل الخروج" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "غير مصرح" });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: "المستخدم غير موجود" });
    }
    
    res.json({ ...user, password: undefined });
  });

  // User routes - Super Admin only for admins
  app.get("/api/users/admins", requireRole("super_admin"), async (req, res) => {
    try {
      const admins = await storage.getUsersByRole("admin");
      res.json(admins.map((u) => ({ ...u, password: undefined })));
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب البيانات" });
    }
  });

  // Event managers - Admin or Super Admin
  app.get("/api/users/event-managers", requireRole("super_admin", "admin"), async (req, res) => {
    try {
      const managers = await storage.getUsersByRole("event_manager");
      res.json(managers.map((u) => ({ ...u, password: undefined })));
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب البيانات" });
    }
  });

  // Organizers - Event Manager only (their own organizers)
  app.get("/api/users/organizers", requireRole("event_manager", "super_admin", "admin"), async (req, res) => {
    try {
      const user = (req as any).user;
      let organizers;
      if (user.role === "event_manager") {
        organizers = await storage.getUsersByCreator(user.id);
      } else {
        organizers = await storage.getUsersByRole("organizer");
      }
      res.json(organizers.map((u) => ({ ...u, password: undefined })));
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب البيانات" });
    }
  });

  // Create user - Role-based
  app.post("/api/users", requireAuth, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser) return res.status(401).json({ error: "غير مصرح" });

      const { role } = req.body;

      // Check permissions
      if (role === "admin" && currentUser.role !== "super_admin") {
        return res.status(403).json({ error: "غير مسموح" });
      }
      if (role === "event_manager" && !["super_admin", "admin"].includes(currentUser.role)) {
        return res.status(403).json({ error: "غير مسموح" });
      }
      if (role === "organizer" && currentUser.role !== "event_manager") {
        return res.status(403).json({ error: "غير مسموح" });
      }

      // Validate request
      const validation = insertUserSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "بيانات غير صالحة" });
      }

      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ error: "اسم المستخدم مستخدم مسبقاً" });
      }

      const newUser = await storage.createUser({
        ...req.body,
        password: hashPassword(req.body.password),
        createdById: currentUser.id,
      });

      res.json({ ...newUser, password: undefined });
    } catch (error) {
      res.status(500).json({ error: "خطأ في إنشاء المستخدم" });
    }
  });

  // Event routes - Event Manager role
  app.get("/api/events", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ error: "غير مصرح" });

      let eventList;
      if (user.role === "event_manager") {
        eventList = await storage.getEventsByManager(user.id);
      } else if (user.role === "organizer") {
        eventList = await storage.getOrganizerEvents(user.id);
      } else {
        eventList = await storage.getEvents();
      }
      res.json(eventList);
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب المناسبات" });
    }
  });

  app.get("/api/events/:id", requireAuth, async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ error: "المناسبة غير موجودة" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ error: "غير مصرح" });

      // Check access
      if (user.role === "event_manager" && event.eventManagerId !== user.id) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      res.json(event);
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب المناسبة" });
    }
  });

  app.post("/api/events", requireRole("event_manager"), async (req, res) => {
    try {
      const user = (req as any).user;

      // Parse date string to Date object
      const eventData = {
        ...req.body,
        eventManagerId: user.id,
        date: req.body.date ? new Date(req.body.date) : undefined,
        isActive: true,
      };

      // Validate required fields
      if (!eventData.name || !eventData.date) {
        return res.status(400).json({ error: "اسم المناسبة والتاريخ مطلوبان" });
      }

      const event = await storage.createEvent(eventData);

      await storage.createAuditLog({
        eventId: event.id,
        userId: user.id,
        action: "create_event",
        details: `تم إنشاء المناسبة: ${event.name}`,
      });

      res.json(event);
    } catch (error) {
      res.status(500).json({ error: "خطأ في إنشاء المناسبة" });
    }
  });

  app.patch("/api/events/:id", requireRole("event_manager"), async (req, res) => {
    try {
      const user = (req as any).user;
      const event = await storage.getEvent(req.params.id);
      
      if (!event) {
        return res.status(404).json({ error: "المناسبة غير موجودة" });
      }

      if (event.eventManagerId !== user.id) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      const updated = await storage.updateEvent(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "خطأ في تحديث المناسبة" });
    }
  });

  app.delete("/api/events/:id", requireRole("event_manager"), async (req, res) => {
    try {
      const user = (req as any).user;
      const event = await storage.getEvent(req.params.id);
      
      if (!event) {
        return res.status(404).json({ error: "المناسبة غير موجودة" });
      }

      if (event.eventManagerId !== user.id) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      await storage.deleteEvent(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "خطأ في حذف المناسبة" });
    }
  });

  // Guest routes
  app.get("/api/events/:id/guests", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ error: "غير مصرح" });

      const event = await storage.getEvent(req.params.id);
      if (!event) return res.status(404).json({ error: "المناسبة غير موجودة" });

      // Check access
      if (user.role === "event_manager" && event.eventManagerId !== user.id) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      const guests = await storage.getGuestsByEvent(req.params.id);
      res.json(guests);
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب الضيوف" });
    }
  });

  app.post("/api/events/:id/upload-guests", requireRole("event_manager"), upload.single("file"), async (req, res) => {
    try {
      const user = (req as any).user;
      const event = await storage.getEvent(req.params.id);
      
      if (!event || event.eventManagerId !== user.id) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "لم يتم رفع ملف" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];

      const guestsToCreate = data.map((row) => ({
        eventId: req.params.id,
        name: String(row["الاسم"] || row["Name"] || row["name"] || ""),
        phone: String(row["الجوال"] || row["Phone"] || row["phone"] || ""),
        category: ((row["الفئة"] || row["Category"] || "regular").toString().toLowerCase()) as any,
        companions: parseInt(row["عدد المرافقين"] || row["Companions"] || "0") || 0,
        notes: String(row["ملاحظات"] || row["Notes"] || ""),
        qrCode: randomUUID(),
      }));

      const createdGuests = await storage.createGuests(guestsToCreate);

      await storage.createAuditLog({
        eventId: req.params.id,
        userId: user.id,
        action: "upload_guests",
        details: `تم رفع ${createdGuests.length} ضيف`,
      });

      res.json({ count: createdGuests.length, guests: createdGuests });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "خطأ في معالجة الملف" });
    }
  });

  app.post("/api/guests/:id/check-in", requireRole("organizer", "event_manager"), async (req, res) => {
    try {
      const user = (req as any).user;
      const guest = await storage.getGuest(req.params.id);
      
      if (!guest) {
        return res.status(404).json({
          status: "invalid",
          message: "الضيف غير موجود",
        });
      }

      // Verify organizer has access to this event
      if (user.role === "organizer") {
        const assignedEvents = await storage.getOrganizerEvents(user.id);
        if (!assignedEvents.some(e => e.id === guest.eventId)) {
          return res.status(403).json({ error: "غير مسموح" });
        }
      }

      if (guest.isCheckedIn) {
        const checkedInByUser = guest.checkedInBy
          ? await storage.getUser(guest.checkedInBy)
          : null;
        return res.json({
          status: "duplicate",
          guest,
          message: "تم استخدام هذه الدعوة مسبقاً!",
          checkedInAt: guest.checkedInAt,
          checkedInBy: checkedInByUser?.name || "غير معروف",
        });
      }

      const updatedGuest = await storage.checkInGuest(req.params.id, user.id);

      await storage.createAuditLog({
        eventId: guest.eventId,
        userId: user.id,
        action: "check_in",
        details: `تم تسجيل حضور: ${guest.name}`,
        guestId: guest.id,
      });

      res.json({
        status: "success",
        guest: updatedGuest,
        message: "تم تسجيل الحضور بنجاح",
      });
    } catch (error) {
      res.status(500).json({ error: "خطأ في تسجيل الحضور" });
    }
  });

  // Organizer events
  app.get("/api/organizer/events", requireRole("organizer", "event_manager"), async (req, res) => {
    try {
      const user = (req as any).user;

      if (user.role === "organizer") {
        const events = await storage.getOrganizerEvents(user.id);
        res.json(events);
      } else {
        const events = await storage.getEventsByManager(user.id);
        res.json(events);
      }
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب المناسبات" });
    }
  });

  // Event organizers management
  app.get("/api/events/:id/organizers", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ error: "غير مصرح" });

      const event = await storage.getEvent(req.params.id);
      if (!event) return res.status(404).json({ error: "المناسبة غير موجودة" });

      // Check access - event manager owns event, organizer is assigned, or admin
      if (user.role === "event_manager" && event.eventManagerId !== user.id) {
        return res.status(403).json({ error: "غير مسموح" });
      }
      if (user.role === "organizer") {
        const assignedEvents = await storage.getOrganizerEvents(user.id);
        if (!assignedEvents.some(e => e.id === event.id)) {
          return res.status(403).json({ error: "غير مسموح" });
        }
      }

      const organizers = await storage.getEventOrganizers(req.params.id);
      res.json(organizers.map((u) => ({ ...u, password: undefined })));
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب المنظمين" });
    }
  });

  app.post("/api/events/:id/organizers", requireRole("event_manager"), async (req, res) => {
    try {
      const user = (req as any).user;
      const event = await storage.getEvent(req.params.id);
      
      if (!event || event.eventManagerId !== user.id) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      const { organizerId } = req.body;
      const assignment = await storage.assignOrganizer({
        eventId: req.params.id,
        organizerId,
      });
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ error: "خطأ في تعيين المنظم" });
    }
  });

  app.delete("/api/events/:id/organizers/:organizerId", requireRole("event_manager"), async (req, res) => {
    try {
      const user = (req as any).user;
      const event = await storage.getEvent(req.params.id);
      
      if (!event || event.eventManagerId !== user.id) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      await storage.removeOrganizer(req.params.id, req.params.organizerId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "خطأ في إزالة المنظم" });
    }
  });

  // Audit logs - Event manager only
  app.get("/api/events/:id/audit-logs", requireRole("event_manager", "super_admin", "admin"), async (req, res) => {
    try {
      const user = (req as any).user;
      const event = await storage.getEvent(req.params.id);
      
      if (!event) return res.status(404).json({ error: "المناسبة غير موجودة" });

      // Event manager can only see their own event logs
      if (user.role === "event_manager" && event.eventManagerId !== user.id) {
        return res.status(403).json({ error: "غير مسموح" });
      }

      const logs = await storage.getAuditLogsByEvent(req.params.id);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب السجلات" });
    }
  });

  // Stats routes - Role-based
  app.get("/api/stats/super-admin", requireRole("super_admin"), async (req, res) => {
    try {
      const stats = await storage.getStats("super_admin");
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب الإحصائيات" });
    }
  });

  app.get("/api/stats/admin", requireRole("admin", "super_admin"), async (req, res) => {
    try {
      const stats = await storage.getStats("admin");
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب الإحصائيات" });
    }
  });

  app.get("/api/stats/event-manager", requireRole("event_manager"), async (req, res) => {
    try {
      const user = (req as any).user;
      const stats = await storage.getStats("event_manager", user.id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "خطأ في جلب الإحصائيات" });
    }
  });

  // QR Download placeholder
  app.get("/api/events/:id/download-qr", requireRole("event_manager"), async (req, res) => {
    try {
      res.status(501).json({ error: "ميزة قيد التطوير" });
    } catch (error) {
      res.status(500).json({ error: "خطأ في تحميل الأكواد" });
    }
  });

  return httpServer;
}
