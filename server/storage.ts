import {
  users,
  events,
  guests,
  eventOrganizers,
  auditLogs,
  type User,
  type InsertUser,
  type Event,
  type InsertEvent,
  type Guest,
  type InsertGuest,
  type EventOrganizer,
  type InsertEventOrganizer,
  type AuditLog,
  type InsertAuditLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsersByRole(role: string): Promise<User[]>;
  getUsersByCreator(createdById: string): Promise<User[]>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;

  // Events
  getEvent(id: string): Promise<Event | undefined>;
  getEvents(): Promise<Event[]>;
  getEventsByManager(managerId: string): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, data: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: string): Promise<void>;

  // Guests
  getGuest(id: string): Promise<Guest | undefined>;
  getGuestByQrCode(qrCode: string): Promise<Guest | undefined>;
  getGuestsByEvent(eventId: string): Promise<Guest[]>;
  createGuest(guest: InsertGuest): Promise<Guest>;
  createGuests(guests: InsertGuest[]): Promise<Guest[]>;
  updateGuest(id: string, data: Partial<Guest>): Promise<Guest | undefined>;
  deleteGuest(id: string): Promise<void>;
  checkInGuest(id: string, organizerId: string): Promise<Guest | undefined>;

  // Event Organizers
  getEventOrganizers(eventId: string): Promise<User[]>;
  getOrganizerEvents(organizerId: string): Promise<Event[]>;
  assignOrganizer(data: InsertEventOrganizer): Promise<EventOrganizer>;
  removeOrganizer(eventId: string, organizerId: string): Promise<void>;

  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogsByEvent(eventId: string): Promise<AuditLog[]>;

  // Stats
  getStats(role: string, userId?: string): Promise<Record<string, number>>;
  getComprehensiveStats(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, role as any));
  }

  async getUsersByCreator(createdById: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.createdById, createdById));
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Events
  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event || undefined;
  }

  async getEvents(): Promise<Event[]> {
    return db.select().from(events).orderBy(desc(events.date));
  }

  async getEventsByManager(managerId: string): Promise<Event[]> {
    return db.select().from(events).where(eq(events.eventManagerId, managerId)).orderBy(desc(events.date));
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const [event] = await db.insert(events).values(insertEvent).returning();
    return event;
  }

  async updateEvent(id: string, data: Partial<InsertEvent>): Promise<Event | undefined> {
    const [event] = await db.update(events).set(data).where(eq(events.id, id)).returning();
    return event || undefined;
  }

  async deleteEvent(id: string): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
  }

  // Guests
  async getGuest(id: string): Promise<Guest | undefined> {
    const [guest] = await db.select().from(guests).where(eq(guests.id, id));
    return guest || undefined;
  }

  async getGuestByQrCode(qrCode: string): Promise<Guest | undefined> {
    const [guest] = await db.select().from(guests).where(eq(guests.qrCode, qrCode));
    return guest || undefined;
  }

  async getGuestsByEvent(eventId: string): Promise<Guest[]> {
    return db.select().from(guests).where(eq(guests.eventId, eventId));
  }

  async createGuest(insertGuest: InsertGuest): Promise<Guest> {
    const [guest] = await db.insert(guests).values(insertGuest).returning();
    return guest;
  }

  async createGuests(insertGuests: InsertGuest[]): Promise<Guest[]> {
    if (insertGuests.length === 0) return [];
    return db.insert(guests).values(insertGuests).returning();
  }

  async updateGuest(id: string, data: Partial<Guest>): Promise<Guest | undefined> {
    const [guest] = await db.update(guests).set(data).where(eq(guests.id, id)).returning();
    return guest || undefined;
  }

  async deleteGuest(id: string): Promise<void> {
    await db.delete(guests).where(eq(guests.id, id));
  }

  async checkInGuest(id: string, organizerId: string): Promise<Guest | undefined> {
    const [guest] = await db
      .update(guests)
      .set({
        isCheckedIn: true,
        checkedInAt: new Date(),
        checkedInBy: organizerId,
      })
      .where(eq(guests.id, id))
      .returning();
    return guest || undefined;
  }

  // Event Organizers
  async getEventOrganizers(eventId: string): Promise<User[]> {
    const assignments = await db
      .select()
      .from(eventOrganizers)
      .where(eq(eventOrganizers.eventId, eventId));
    
    if (assignments.length === 0) return [];
    
    const organizerIds = assignments.map((a) => a.organizerId);
    const organizers = await Promise.all(
      organizerIds.map((id) => this.getUser(id))
    );
    return organizers.filter((o): o is User => o !== undefined);
  }

  async getOrganizerEvents(organizerId: string): Promise<Event[]> {
    const assignments = await db
      .select()
      .from(eventOrganizers)
      .where(eq(eventOrganizers.organizerId, organizerId));
    
    if (assignments.length === 0) return [];
    
    const eventIds = assignments.map((a) => a.eventId);
    const eventList = await Promise.all(
      eventIds.map((id) => this.getEvent(id))
    );
    return eventList.filter((e): e is Event => e !== undefined && e.isActive === true);
  }

  async assignOrganizer(data: InsertEventOrganizer): Promise<EventOrganizer> {
    const [assignment] = await db.insert(eventOrganizers).values(data).returning();
    return assignment;
  }

  async removeOrganizer(eventId: string, organizerId: string): Promise<void> {
    await db
      .delete(eventOrganizers)
      .where(
        and(
          eq(eventOrganizers.eventId, eventId),
          eq(eventOrganizers.organizerId, organizerId)
        )
      );
  }

  // Audit Logs
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [auditLog] = await db.insert(auditLogs).values(log).returning();
    return auditLog;
  }

  async getAuditLogsByEvent(eventId: string): Promise<AuditLog[]> {
    return db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.eventId, eventId))
      .orderBy(desc(auditLogs.timestamp));
  }

  // Stats
  async getStats(role: string, userId?: string): Promise<Record<string, number>> {
    const allUsers = await db.select().from(users);
    const allEvents = await db.select().from(events);
    const allGuests = await db.select().from(guests);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (role === "super_admin") {
      return {
        totalAdmins: allUsers.filter((u) => u.role === "admin").length,
        totalEventManagers: allUsers.filter((u) => u.role === "event_manager").length,
        totalEvents: allEvents.length,
        activeEvents: allEvents.filter((e) => e.isActive).length,
      };
    }

    if (role === "admin") {
      return {
        totalEventManagers: allUsers.filter((u) => u.role === "event_manager").length,
        totalEvents: allEvents.length,
        activeEvents: allEvents.filter((e) => e.isActive).length,
        totalGuests: allGuests.length,
      };
    }

    if (role === "event_manager" && userId) {
      const userEvents = allEvents.filter((e) => e.eventManagerId === userId);
      const userEventIds = userEvents.map((e) => e.id);
      const userGuests = allGuests.filter((g) => userEventIds.includes(g.eventId));
      
      return {
        totalEvents: userEvents.length,
        activeEvents: userEvents.filter((e) => e.isActive).length,
        totalGuests: userGuests.length,
        checkedInToday: userGuests.filter(
          (g) => g.isCheckedIn && g.checkedInAt && new Date(g.checkedInAt) >= today
        ).length,
      };
    }

    return {};
  }

  async getComprehensiveStats(): Promise<any> {
    const allUsers = await db.select().from(users);
    const allEvents = await db.select().from(events);
    const allGuests = await db.select().from(guests);
    const allAssignments = await db.select().from(eventOrganizers);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const admins = allUsers.filter((u) => u.role === "admin");
    const eventManagers = allUsers.filter((u) => u.role === "event_manager");
    const organizers = allUsers.filter((u) => u.role === "organizer");

    const adminStats = admins.map((admin) => {
      const managersCreatedByAdmin = eventManagers.filter((m) => m.createdById === admin.id);
      const organizersCreatedByAdmin = organizers.filter((o) => o.createdById === admin.id);
      return {
        id: admin.id,
        name: admin.name,
        username: admin.username,
        isActive: admin.isActive,
        createdAt: admin.createdAt,
        eventManagersCount: managersCreatedByAdmin.length,
        organizersCount: organizersCreatedByAdmin.length,
      };
    });

    const eventManagerStats = eventManagers.map((manager) => {
      const managerEvents = allEvents.filter((e) => e.eventManagerId === manager.id);
      const managerEventIds = managerEvents.map((e) => e.id);
      const managerGuests = allGuests.filter((g) => managerEventIds.includes(g.eventId));
      const managerOrganizers = organizers.filter((o) => o.createdById === manager.id);
      const checkedInGuests = managerGuests.filter((g) => g.isCheckedIn);
      
      return {
        id: manager.id,
        name: manager.name,
        username: manager.username,
        isActive: manager.isActive,
        createdAt: manager.createdAt,
        eventsCount: managerEvents.length,
        activeEventsCount: managerEvents.filter((e) => e.isActive).length,
        totalGuests: managerGuests.length,
        checkedInGuests: checkedInGuests.length,
        organizersCount: managerOrganizers.length,
        events: managerEvents.map((event) => {
          const eventGuests = allGuests.filter((g) => g.eventId === event.id);
          const eventOrgs = allAssignments.filter((a) => a.eventId === event.id);
          return {
            id: event.id,
            name: event.name,
            date: event.date,
            location: event.location,
            isActive: event.isActive,
            totalGuests: eventGuests.length,
            checkedIn: eventGuests.filter((g) => g.isCheckedIn).length,
            organizersCount: eventOrgs.length,
          };
        }),
      };
    });

    const eventStats = allEvents.map((event) => {
      const eventGuests = allGuests.filter((g) => g.eventId === event.id);
      const eventOrgs = allAssignments.filter((a) => a.eventId === event.id);
      const manager = eventManagers.find((m) => m.id === event.eventManagerId);
      const checkedIn = eventGuests.filter((g) => g.isCheckedIn);
      
      const categoryBreakdown = {
        vip: eventGuests.filter((g) => g.category === "vip").length,
        regular: eventGuests.filter((g) => g.category === "regular").length,
        media: eventGuests.filter((g) => g.category === "media").length,
        sponsor: eventGuests.filter((g) => g.category === "sponsor").length,
      };

      return {
        id: event.id,
        name: event.name,
        date: event.date,
        location: event.location,
        isActive: event.isActive,
        createdAt: event.createdAt,
        managerName: manager?.name || "غير معروف",
        managerId: event.eventManagerId,
        totalGuests: eventGuests.length,
        checkedIn: checkedIn.length,
        pending: eventGuests.length - checkedIn.length,
        checkInRate: eventGuests.length > 0 ? Math.round((checkedIn.length / eventGuests.length) * 100) : 0,
        organizersCount: eventOrgs.length,
        categoryBreakdown,
      };
    });

    const organizerStats = organizers.map((organizer) => {
      const assignments = allAssignments.filter((a) => a.organizerId === organizer.id);
      const assignedEventIds = assignments.map((a) => a.eventId);
      const assignedEvents = allEvents.filter((e) => assignedEventIds.includes(e.id));
      
      return {
        id: organizer.id,
        name: organizer.name,
        username: organizer.username,
        isActive: organizer.isActive,
        createdAt: organizer.createdAt,
        assignedEventsCount: assignedEvents.length,
        events: assignedEvents.map((e) => ({ id: e.id, name: e.name, date: e.date })),
      };
    });

    const totalCheckedIn = allGuests.filter((g) => g.isCheckedIn).length;
    const todayCheckIns = allGuests.filter(
      (g) => g.isCheckedIn && g.checkedInAt && new Date(g.checkedInAt) >= today
    ).length;

    return {
      overview: {
        totalAdmins: admins.length,
        activeAdmins: admins.filter((a) => a.isActive).length,
        totalEventManagers: eventManagers.length,
        activeEventManagers: eventManagers.filter((m) => m.isActive).length,
        totalOrganizers: organizers.length,
        activeOrganizers: organizers.filter((o) => o.isActive).length,
        totalEvents: allEvents.length,
        activeEvents: allEvents.filter((e) => e.isActive).length,
        totalGuests: allGuests.length,
        totalCheckedIn,
        todayCheckIns,
        checkInRate: allGuests.length > 0 ? Math.round((totalCheckedIn / allGuests.length) * 100) : 0,
      },
      admins: adminStats,
      eventManagers: eventManagerStats,
      events: eventStats,
      organizers: organizerStats,
    };
  }
}

export const storage = new DatabaseStorage();
