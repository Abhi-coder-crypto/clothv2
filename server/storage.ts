import { db } from "./db";
import { savedLooks, type InsertSavedLook, type SavedLook } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getLooks(): Promise<SavedLook[]>;
  createLook(look: InsertSavedLook): Promise<SavedLook>;
  deleteLook(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getLooks(): Promise<SavedLook[]> {
    return await db.select().from(savedLooks).orderBy(savedLooks.createdAt);
  }

  async createLook(look: InsertSavedLook): Promise<SavedLook> {
    const [newLook] = await db.insert(savedLooks).values(look).returning();
    return newLook;
  }

  async deleteLook(id: number): Promise<void> {
    await db.delete(savedLooks).where(eq(savedLooks.id, id));
  }
}

export const storage = new DatabaseStorage();
