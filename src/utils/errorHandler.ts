import * as Sentry from "@sentry/react";
import { AuthError } from "firebase/auth";
import { PostgrestError } from "@supabase/supabase-js";

// Definisi Tipe Error agar konsisten
export type ErrorCategory = "AUTH" | "DATABASE" | "STORAGE" | "NETWORK" | "UI" | "UNKNOWN";
export type ErrorSeverity = "fatal" | "error" | "warning" | "info";

interface ErrorHandlerProps {
  error: any;
  category: ErrorCategory;
  message: string; // Pesan yang mudah dibaca manusia
  severity?: ErrorSeverity;
  userContext?: { id: string; email?: string }; // Opsional: info siapa yang kena error
}

/**
 * Fungsi sentral untuk menangkap dan melaporkan error ke Sentry
 * dengan tagging dan grouping yang rapi.
 */
export const captureSystemError = ({
  error,
  category,
  message,
  severity = "error",
  userContext
}: ErrorHandlerProps) => {
  
  // 1. Cek Koneksi Internet (Network Error override)
  if (!navigator.onLine) {
    category = "NETWORK";
    message = `[OFFLINE] ${message}`;
    severity = "warning";
  }

  Sentry.withScope((scope) => {
    // 2. Set User Context jika ada
    if (userContext) {
      scope.setUser({ id: userContext.id, email: userContext.email });
    }

    // 3. Set Tags (Untuk filter di Dashboard Sentry)
    scope.setTag("error_category", category);
    scope.setLevel(severity);
    
    // 4. Logika Spesifik per Kategori
    if (category === "AUTH") {
      const firebaseError = error as AuthError;
      scope.setTag("auth_provider", "firebase");
      scope.setTag("auth_code", firebaseError.code); // Contoh: auth/wrong-password
      scope.setExtra("firebase_message", firebaseError.message);
    }

    if (category === "DATABASE") {
      // Asumsi error dari Supabase
      const dbError = error as PostgrestError;
      scope.setTag("db_provider", "supabase");
      scope.setTag("db_code", dbError.code);
      scope.setExtra("db_hint", dbError.hint);
      scope.setExtra("db_details", dbError.details);
    }

    if (category === "STORAGE") {
      scope.setTag("storage_provider", "cloudinary");
      // Jika error objek memiliki respon status
      if (error.response) {
        scope.setTag("http_status", error.response.status);
      }
    }

    // 5. Tambahkan Breadcrumb (Jejak sebelum error)
    scope.addBreadcrumb({
      category: category.toLowerCase(),
      message: message,
      level: severity,
      data: {
        raw_error: error.toString()
      }
    });

    // 6. Kirim ke Sentry
    // Fingerprint custom agar error yang sama dikelompokkan dengan benar
    Sentry.captureException(error, {
      fingerprint: [category, message], 
    });
  });

  // 7. (Opsional) Log ke console saat Development
  if (process.env.NODE_ENV === 'development') {
    console.group(`[${category}] ${message}`);
    console.error(error);
    console.groupEnd();
  }
};