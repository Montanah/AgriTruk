// /mock/mockNotifications.ts
// Simple in-memory mock notification log for development

export const mockNotifications: any[] = [];

// For browser-based testing, expose globally
if (typeof window !== 'undefined') {
  (window as any).mockNotifications = mockNotifications;
}
