import { db } from "./db";
import { savedLooks, type InsertSavedLook, type SavedLook } from "@shared/schema";

export interface IStorage {
  getLooks(): Promise<SavedLook[]>;
  createLook(look: InsertSavedLook): Promise<SavedLook>;
}

export class DatabaseStorage implements IStorage {
  async getLooks(): Promise<SavedLook[]> {
    return await db.select().from(savedLooks);
  }

  async createLook(look: InsertSavedLook): Promise<SavedLook> {
    const [newLook] = await db.insert(savedLooks).values(look).returning();
    return newLook;
  }
}

export const storage = new DatabaseStorage();
